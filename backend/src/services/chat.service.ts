import mongoose from "mongoose";
import {
  ChatMessageModel,
  ChatSessionModel,
  ContentModel,
  UploadedFileModel,
} from "../db.js";

export async function ensureUserChatSession(
  userId: string,
  requestedChatId: string,
  question: string,
) {
  if (requestedChatId) {
    const existing = await ChatSessionModel.findOne({
      _id: new mongoose.Types.ObjectId(requestedChatId),
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (existing) return existing;
  }

  const title = question.slice(0, 60) || "New Chat";
  return ChatSessionModel.create({
    userId: new mongoose.Types.ObjectId(userId),
    title,
  });
}

export async function getOwnedChatOrThrow(userId: string, chatId: string) {
  const chat = await ChatSessionModel.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    userId: new mongoose.Types.ObjectId(userId),
  });
  if (!chat) {
    throw new Error("Chat not found");
  }
  return chat;
}

export async function deleteOwnedChat(
  userId: string,
  chatId: string,
): Promise<void> {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const chatObjectId = new mongoose.Types.ObjectId(chatId);

  const ownedChat = await ChatSessionModel.findOne({
    _id: chatObjectId,
    userId: userObjectId,
  });

  if (!ownedChat) {
    throw new Error("Chat not found");
  }

  await ChatMessageModel.deleteMany({
    userId: userObjectId,
    chatId: chatObjectId,
  });

  const files = await UploadedFileModel.find({
    userId: userObjectId,
    chatId: chatObjectId,
  })
    .select({ _id: 1 })
    .lean();

  const fileIds = files.map((file) => file._id);

  await UploadedFileModel.deleteMany({
    userId: userObjectId,
    chatId: chatObjectId,
  });

  if (fileIds.length > 0) {
    await ContentModel.deleteMany({
      userId: userObjectId,
      $or: [{ chatId: chatObjectId }, { fileId: { $in: fileIds } }],
    });
  } else {
    await ContentModel.deleteMany({
      userId: userObjectId,
      chatId: chatObjectId,
    });
  }

  await ChatSessionModel.deleteOne({
    _id: chatObjectId,
    userId: userObjectId,
  });
}
