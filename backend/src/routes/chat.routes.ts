import { Router } from "express";
import mongoose from "mongoose";
import { genAI } from "../config/ai.js";
import { CHAT_MODEL } from "../config/env.js";
import { ChatMessageModel, ChatSessionModel } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { ensureUserChatSession } from "../services/chat.service.js";
import { embedText, findRelevantChunks } from "../services/vector.service.js";
import { buildRagPrompt } from "../utils/rag.js";
import { extractChatId, extractQuestion } from "../utils/request.js";

const chatRouter = Router();

// Keep old endpoints as explicit unauthorized responses for backward compatibility.
chatRouter.post("/api/v1/chat", (_req, res) => {
  return res.status(401).json({
    message: "Login is required. Use the authenticated chat flow.",
  });
});

chatRouter.post("/api/v1/chat/stream", (_req, res) => {
  return res.status(401).json({
    message: "Login is required. Use the authenticated chat flow.",
  });
});

chatRouter.post("/api/v1/chat/user", requireAuth, async (req, res) => {
  try {
    const question = extractQuestion(req.body);
    if (!question) {
      return res.status(400).json({ message: "Question is required" });
    }

    const chat = await ensureUserChatSession(
      req.user?.id || "",
      extractChatId(req.body),
      question,
    );

    await ChatMessageModel.create({
      userId: new mongoose.Types.ObjectId(req.user?.id),
      chatId: chat._id,
      role: "user",
      text: question,
      sources: [],
    });

    const questionVector = await embedText(question);
    const relevantChunks = await findRelevantChunks(questionVector, {
      userId: req.user?.id || "",
      chatId: chat._id.toString(),
    });

    if (!relevantChunks.length) {
      const emptyAnswer =
        "This chat does not have a PDF yet. Upload one PDF to this chat before asking questions.";
      await ChatMessageModel.create({
        userId: new mongoose.Types.ObjectId(req.user?.id),
        chatId: chat._id,
        role: "assistant",
        text: emptyAnswer,
        sources: [],
      });

      return res.status(200).json({
        answer: emptyAnswer,
        sources: [],
        chatId: chat._id,
      });
    }

    const contextText = relevantChunks
      .map((chunk) => chunk.chunkText)
      .join("\n\n");
    const prompt = buildRagPrompt(contextText, question);
    const chatModel = genAI.getGenerativeModel({ model: CHAT_MODEL });
    const result = await chatModel.generateContent(prompt);
    const answer = result.response.text();
    const sources = [...new Set(relevantChunks.map((chunk) => chunk.fileName))];

    await ChatMessageModel.create({
      userId: new mongoose.Types.ObjectId(req.user?.id),
      chatId: chat._id,
      role: "assistant",
      text: answer,
      sources,
    });

    return res.status(200).json({
      answer,
      sources,
      chatId: chat._id,
    });
  } catch (error) {
    console.error("User chat error:", error);
    return res.status(500).json({ message: "Error during user chat" });
  }
});

chatRouter.post("/api/v1/chat/user/stream", requireAuth, async (req, res) => {
  try {
    const question = extractQuestion(req.body);
    if (!question) {
      return res.status(400).json({ message: "Question is required" });
    }

    const chat = await ensureUserChatSession(
      req.user?.id || "",
      extractChatId(req.body),
      question,
    );

    await ChatMessageModel.create({
      userId: new mongoose.Types.ObjectId(req.user?.id),
      chatId: chat._id,
      role: "user",
      text: question,
      sources: [],
    });

    const questionVector = await embedText(question);
    const relevantChunks = await findRelevantChunks(questionVector, {
      userId: req.user?.id || "",
      chatId: chat._id.toString(),
    });

    if (!relevantChunks.length) {
      const emptyAnswer =
        "This chat does not have a PDF yet. Upload one PDF to this chat before asking questions.";
      await ChatMessageModel.create({
        userId: new mongoose.Types.ObjectId(req.user?.id),
        chatId: chat._id,
        role: "assistant",
        text: emptyAnswer,
        sources: [],
      });

      // Keep response shape consistent so the frontend parser can always follow one flow.
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write(`data: ${JSON.stringify({ token: emptyAnswer })}\n\n`);
      res.write(
        `event: done\ndata: ${JSON.stringify({ sources: [], chatId: chat._id })}\n\n`,
      );
      res.end();
      return;
    }

    const contextText = relevantChunks
      .map((chunk) => chunk.chunkText)
      .join("\n\n");
    const prompt = buildRagPrompt(contextText, question);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const chatModel = genAI.getGenerativeModel({ model: CHAT_MODEL });
    const streamResult = await chatModel.generateContentStream(prompt);
    let answerText = "";

    for await (const chunk of streamResult.stream) {
      const text = chunk.text();
      if (text) {
        answerText += text;
        res.write(`data: ${JSON.stringify({ token: text })}\n\n`);
      }
    }

    const sources = [...new Set(relevantChunks.map((chunk) => chunk.fileName))];
    await ChatMessageModel.create({
      userId: new mongoose.Types.ObjectId(req.user?.id),
      chatId: chat._id,
      role: "assistant",
      text: answerText,
      sources,
    });

    await ChatSessionModel.findByIdAndUpdate(chat._id, {
      updatedAt: new Date(),
    });

    res.write(
      `event: done\ndata: ${JSON.stringify({ sources, chatId: chat._id })}\n\n`,
    );
    res.end();
  } catch (error) {
    console.error("User streaming chat error:", error);
    if (!res.headersSent) {
      return res
        .status(500)
        .json({ message: "Error during user streaming chat" });
    }
    res.write(
      `event: error\ndata: ${JSON.stringify({ message: "Error during user streaming chat" })}\n\n`,
    );
    res.end();
  }
});

export default chatRouter;
