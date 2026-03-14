import { Router } from "express";
import mongoose from "mongoose";
import { ChatMessageModel, ChatSessionModel } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { deleteOwnedChat } from "../services/chat.service.js";

const chatsRouter = Router();

chatsRouter.get("/api/v1/chats", requireAuth, async (req, res) => {
  const chats = await ChatSessionModel.find({
    userId: new mongoose.Types.ObjectId(req.user?.id),
  })
    .sort({ updatedAt: -1 })
    .lean();
  return res.status(200).json({ chats });
});

chatsRouter.post("/api/v1/chats", requireAuth, async (req, res) => {
  const title = String(req.body?.title || "New Chat").trim() || "New Chat";
  const chat = await ChatSessionModel.create({
    userId: new mongoose.Types.ObjectId(req.user?.id),
    title,
  });
  return res.status(201).json({ chat });
});

chatsRouter.delete("/api/v1/chats/:chatId", requireAuth, async (req, res) => {
  try {
    const rawChatId = req.params.chatId;
    const chatId = Array.isArray(rawChatId) ? rawChatId[0] : rawChatId;
    if (!chatId) {
      return res.status(400).json({ message: "chatId is required" });
    }

    await deleteOwnedChat(req.user?.id || "", chatId);
    return res.status(200).json({ message: "Chat deleted" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Chat not found") {
      return res.status(404).json({ message });
    }
    return res
      .status(500)
      .json({ message: `Could not delete chat: ${message}` });
  }
});

chatsRouter.get(
  "/api/v1/chats/:chatId/messages",
  requireAuth,
  async (req, res) => {
    const rawChatId = req.params.chatId;
    const chatId = Array.isArray(rawChatId) ? rawChatId[0] : rawChatId;
    if (!chatId) {
      return res.status(400).json({ message: "chatId is required" });
    }

    const chat = await ChatSessionModel.findOne({
      _id: new mongoose.Types.ObjectId(chatId),
      userId: new mongoose.Types.ObjectId(req.user?.id),
    });
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const messages = await ChatMessageModel.find({
      userId: new mongoose.Types.ObjectId(req.user?.id),
      chatId: new mongoose.Types.ObjectId(chatId),
    })
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({ messages });
  },
);

export default chatsRouter;
