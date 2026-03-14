import type { Express } from "express";
import authRouter from "./auth.routes.js";
import chatRouter from "./chat.routes.js";
import chatsRouter from "./chats.routes.js";
import healthRouter from "./health.routes.js";
import uploadRouter from "./upload.routes.js";

export function registerRoutes(app: Express): void {
  app.use(healthRouter);
  app.use(authRouter);
  app.use(chatsRouter);
  app.use(uploadRouter);
  app.use(chatRouter);
}
