import { Router } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { UploadedFileModel } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { getOwnedChatOrThrow } from "../services/chat.service.js";
import { processPdfUpload } from "../services/upload.service.js";
import { extractChatId, getUploadedPdf } from "../utils/request.js";

const uploadRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Keep this route to explicitly tell clients that anonymous upload is disabled.
uploadRouter.post("/api/v1/upload", (_req, res) => {
  return res.status(401).json({
    message: "Login is required. Use the authenticated upload flow.",
  });
});

uploadRouter.post(
  "/api/v1/upload/user",
  requireAuth,
  upload.any(),
  async (req, res) => {
    try {
      const pdfFile = getUploadedPdf(req);
      if (!pdfFile) {
        return res.status(400).json({ message: "NO File Uploaded" });
      }
      if (pdfFile.mimetype !== "application/pdf") {
        return res.status(400).json({ message: "Only PDF files are allowed" });
      }

      const chatId = extractChatId(req.body);
      if (!chatId) {
        return res
          .status(400)
          .json({ message: "Select or create a chat before uploading a PDF." });
      }

      await getOwnedChatOrThrow(req.user?.id || "", chatId);

      const existingFile = await UploadedFileModel.findOne({
        userId: new mongoose.Types.ObjectId(req.user?.id),
        chatId: new mongoose.Types.ObjectId(chatId),
      }).lean();
      if (existingFile) {
        return res.status(409).json({
          message:
            "This chat already has a PDF. Create a new chat for another PDF.",
        });
      }

      const uploadParams: {
        pdfFile: Express.Multer.File;
        userId?: string;
        chatId?: string;
      } = { pdfFile };
      if (req.user?.id) uploadParams.userId = req.user.id;
      if (chatId) uploadParams.chatId = chatId;

      const result = await processPdfUpload(uploadParams);

      return res.status(200).json({
        message: "PDF processed and stored in your account.",
        fileId: result.fileId,
        chunkCount: result.chunkCount,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return res
        .status(500)
        .json({ message: `Error processing PDF: ${message}` });
    }
  },
);

export default uploadRouter;
