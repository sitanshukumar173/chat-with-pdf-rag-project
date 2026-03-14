import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";

export function signUserToken(user: {
  id: string;
  email: string;
  name: string;
}): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
}
