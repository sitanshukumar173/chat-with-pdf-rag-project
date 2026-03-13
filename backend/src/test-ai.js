import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY. Run from backend folder or ensure .env is loaded.",
    );
  }

  console.log("Starting Gemini test...");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const prompt = "Hello! tell me about rag and vecotrs and ai";

  const result = await model.generateContent(prompt);
  console.log("Model response:");
  console.log(result.response.text());
}

run().catch((error) => {
  console.error("Gemini test failed:");
  console.error(error.message || error);
  process.exitCode = 1;
});
