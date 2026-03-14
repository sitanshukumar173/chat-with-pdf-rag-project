import mongoose from "mongoose";
import { genAI } from "../config/ai.js";
import { EMBEDDING_MODEL } from "../config/env.js";
import { ContentModel } from "../db.js";

export async function embedText(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

export async function findRelevantChunks(
  questionVector: number[],
  options?: { userId?: string; chatId?: string },
) {
  const vectorSearchStage: {
    index: string;
    path: string;
    queryVector: number[];
    numCandidates: number;
    limit: number;
  } = {
    index: "vector_index",
    path: "vector",
    queryVector: questionVector,
    numCandidates: options?.userId ? 300 : 120,
    limit: options?.userId ? 60 : 8,
  };

  const pipeline: mongoose.PipelineStage[] = [
    {
      $vectorSearch: vectorSearchStage,
    },
  ];

  if (options?.userId) {
    const match: {
      userId: mongoose.Types.ObjectId;
      chatId?: mongoose.Types.ObjectId;
    } = {
      userId: new mongoose.Types.ObjectId(options.userId),
    };
    if (options.chatId) {
      match.chatId = new mongoose.Types.ObjectId(options.chatId);
    }

    // We intentionally post-filter by user/chat to keep data private even after vector retrieval.
    pipeline.push({
      $match: match,
    });
    pipeline.push({ $limit: 8 });
  }

  return ContentModel.aggregate(pipeline);
}
