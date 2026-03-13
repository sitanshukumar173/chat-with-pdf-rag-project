import mongoose, { model, Schema } from "mongoose";

const ContentSchema = new Schema({
  fileName: { type: String, required: true },
  chunkText: { type: String, required: true },
  vector: { type: [Number], required: true }, // stores embeddings
  embeddingModel: { type: String, required: true }, // tracks vector model for RAG consistency
});

export const ContentModel = model("Content", ContentSchema);
