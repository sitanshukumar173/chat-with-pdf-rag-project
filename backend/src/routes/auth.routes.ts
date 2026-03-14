import { Router } from "express";
import bcrypt from "bcryptjs";
import { UserModel } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { signUserToken } from "../utils/token.js";

const authRouter = Router();

authRouter.post("/api/v1/auth/register", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || "");

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "name, email and password are required" });
    }

    const existing = await UserModel.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({
      name,
      email,
      passwordHash,
    });

    const token = signUserToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ message: `Registration failed: ${message}` });
  }
});

authRouter.post("/api/v1/auth/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "email and password are required" });
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signUserToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ message: `Login failed: ${message}` });
  }
});

authRouter.get("/api/v1/auth/me", requireAuth, async (req, res) => {
  const user = await UserModel.findById(req.user?.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  return res.status(200).json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
  });
});

export default authRouter;
