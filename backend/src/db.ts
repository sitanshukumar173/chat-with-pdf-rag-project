import mongoose, { model, Schema } from "mongoose";

const ContentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  chatId: { type: Schema.Types.ObjectId, ref: "ChatSession" },
  fileId: { type: Schema.Types.ObjectId, ref: "UploadedFile" },
  fileName: { type: String, required: true },
  chunkText: { type: String, required: true },
  vector: { type: [Number], required: true }, // Numeric embedding values used by vector search.
  embeddingModel: { type: String, required: true }, // Keeps track of which model produced this vector.
  createdAt: { type: Date, default: Date.now },
});

ContentSchema.index({ userId: 1, createdAt: -1 });
ContentSchema.index({ userId: 1, chatId: 1, createdAt: -1 });
ContentSchema.index({ fileId: 1, createdAt: -1 });

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true },
);

const UploadedFileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    chatId: {
      type: Schema.Types.ObjectId,
      ref: "ChatSession",
      required: true,
      index: true,
    },
    fileName: { type: String, required: true },
    embeddingModel: { type: String, required: true },
    chunkCount: { type: Number, required: true },
  },
  { timestamps: true },
);

const ChatSessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true },
  },
  { timestamps: true },
);

const ChatMessageSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    chatId: {
      type: Schema.Types.ObjectId,
      ref: "ChatSession",
      required: true,
      index: true,
    },
    role: { type: String, enum: ["user", "assistant"], required: true },
    text: { type: String, required: true },
    sources: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const ContentModel = model("Content", ContentSchema);
export const UserModel = model("User", UserSchema);
export const UploadedFileModel = model("UploadedFile", UploadedFileSchema);
export const ChatSessionModel = model("ChatSession", ChatSessionSchema);
export const ChatMessageModel = model("ChatMessage", ChatMessageSchema);
