import type { Request } from "express";

export function extractQuestion(body: unknown): string {
  const raw =
    typeof body === "string"
      ? body
      : (body as { question?: unknown })?.question;
  return typeof raw === "string" ? raw.trim() : "";
}

export function extractChatId(body: unknown): string {
  const raw =
    typeof body === "object" && body !== null
      ? (body as { chatId?: unknown }).chatId
      : undefined;
  return typeof raw === "string" ? raw.trim() : "";
}

export function getUploadedPdf(req: Request): Express.Multer.File | undefined {
  const files = req.files as Express.Multer.File[] | undefined;
  return files?.[0];
}
