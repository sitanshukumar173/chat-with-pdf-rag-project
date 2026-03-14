import mongoose from "mongoose";
import { PDFParse } from "pdf-parse";
import { EMBEDDING_MODEL } from "../config/env.js";
import { ContentModel, UploadedFileModel } from "../db.js";
import { embedText } from "./vector.service.js";

export async function processPdfUpload(params: {
  pdfFile: Express.Multer.File;
  userId?: string;
  chatId?: string;
}): Promise<{ chunkCount: number; fileId?: string }> {
  const parser = new PDFParse({ data: params.pdfFile.buffer });
  const data = await parser.getText();
  await parser.destroy();

  const chunks =
    data.text
      .replace(/\s+/g, " ")
      .trim()
      .match(/.{1,1000}/g) || [];

  if (chunks.length === 0) {
    throw new Error("Could not extract readable text from this PDF");
  }

  let fileId: string | undefined;
  if (params.userId) {
    if (!params.chatId) {
      throw new Error("chatId is required for user uploads");
    }

    const uploadedPayload: {
      userId: mongoose.Types.ObjectId;
      fileName: string;
      embeddingModel: string;
      chunkCount: number;
      chatId: mongoose.Types.ObjectId;
    } = {
      userId: new mongoose.Types.ObjectId(params.userId),
      fileName: params.pdfFile.originalname,
      embeddingModel: EMBEDDING_MODEL,
      chunkCount: chunks.length,
      chatId: new mongoose.Types.ObjectId(params.chatId),
    };

    const uploaded = await UploadedFileModel.create(uploadedPayload);
    fileId = uploaded._id.toString();
  }

  for (const chunkText of chunks) {
    const vector = await embedText(chunkText);
    const contentPayload: {
      fileName: string;
      chunkText: string;
      vector: number[];
      embeddingModel: string;
      userId?: mongoose.Types.ObjectId;
      chatId?: mongoose.Types.ObjectId;
      fileId?: mongoose.Types.ObjectId;
    } = {
      fileName: params.pdfFile.originalname,
      chunkText,
      vector,
      embeddingModel: EMBEDDING_MODEL,
    };
    if (params.userId) {
      contentPayload.userId = new mongoose.Types.ObjectId(params.userId);
    }
    if (params.chatId) {
      contentPayload.chatId = new mongoose.Types.ObjectId(params.chatId);
    }
    if (fileId) {
      contentPayload.fileId = new mongoose.Types.ObjectId(fileId);
    }

    await ContentModel.create(contentPayload);
  }

  if (fileId) {
    return { chunkCount: chunks.length, fileId };
  }
  return { chunkCount: chunks.length };
}
