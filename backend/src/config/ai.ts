import { GoogleGenerativeAI } from "@google/generative-ai";

// Reuse a single Gemini client for all requests.
export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
