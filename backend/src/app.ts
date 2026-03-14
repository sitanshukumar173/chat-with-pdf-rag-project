import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes/index.js";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  registerRoutes(app);
  return app;
}
