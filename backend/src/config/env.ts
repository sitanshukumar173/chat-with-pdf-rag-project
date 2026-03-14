import dotenv from "dotenv";

// Load environment variables once at startup.
dotenv.config();

export const PORT = process.env.PORT || 5000;
export const MONGO_URI = process.env.MONGO_URI || "";
export const JWT_SECRET = process.env.JWT_SECRET || "change-this-in-production";

export const EMBEDDING_MODEL = "models/gemini-embedding-001";
export const CHAT_MODEL = "gemini-2.5-flash";
