import express from "express";
import type { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import multer from "multer";
// pdf-parse v2 exposes a named class (no default export in ESM).
import { PDFParse } from "pdf-parse";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ContentModel } from "./db.js";

dotenv.config();

// Initialize Gemini client once and reuse it across requests.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
//multer
const upload = multer({ storage: multer.memoryStorage() });

// RAG rule: use one fixed embedding model for both indexing and query embeddings.
const EMBEDDING_MODEL = "models/gemini-embedding-001";

// Basic Health Check
app.get("/", (req: Request, res: Response) => {
  res.send("AI PDF Chat Backend is Running!");
});

// Upload PDF from any multipart file field name (Postman key can be anything).
app.post("/api/v1/upload", upload.any(), async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        message: "GEMINI_API_KEY is missing in backend/.env",
      });
    }

    const files = req.files as Express.Multer.File[] | undefined;
    const pdfFile = files?.[0];

    //is pdf present
    if (!pdfFile) return res.status(400).json({ message: "NO File Uploaded" });
    //is file pdf
    if (pdfFile.mimetype !== "application/pdf") {
      return res.status(400).json({ message: "Only PDF files are allowed" });
    }

    // Parse the uploaded PDF from memory and extract plain text content.
    const parser = new PDFParse({ data: pdfFile.buffer });
    const data = await parser.getText();
    await parser.destroy(); //clean the memory
    const fullText = data.text;

    // Keep chunking simple: normalize whitespace, then split every 1000 chars.
    const chunks =
      fullText
        .replace(/\s+/g, " ")
        .trim()
        .match(/.{1,1000}/g) || [];

    if (chunks.length === 0) {
      return res.status(400).json({
        message: "Could not extract readable text from this PDF",
      });
    }

    const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    console.log("ai running/analyzing pdf....");
    //loop to itrate over all chunk and convert to vector and save it
    for (const it of chunks) {
      // Embed each chunk with the same model to keep vector space consistent.
      const result = await model.embedContent(it);
      const embedding = result.embedding.values;

      //saves to db
      await ContentModel.create({
        fileName: pdfFile.originalname,
        chunkText: it,
        vector: embedding,
        embeddingModel: EMBEDDING_MODEL,
      });
    }
    console.log("all done");
    return res
      .status(200)
      .json({ message: "PDF processed and stored in Vector DB!" });
  } catch (error) {
    console.error("Failed to parse PDF", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({
      message: `Error processing PDF: ${message}`,
      hint: "Check GEMINI_API_KEY and enabled embedding models for your project.",
    });
  }
});

// Return clean multer errors instead of raw stack traces.
app.use(
  (err: unknown, req: Request, res: Response, next: express.NextFunction) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({ message: "Unexpected file field." });
      }
      return res.status(400).json({ message: err.message });
    }

    next(err);
  },
);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.error("Could not connect to MongoDB", err));

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
