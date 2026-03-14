import { Router } from "express";

const healthRouter = Router();

// Basic health check for quick server verification.
healthRouter.get("/", (_req, res) => {
  res.send("AI PDF Chat Backend is Running!");
});

export default healthRouter;
