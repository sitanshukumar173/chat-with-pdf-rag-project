import mongoose from "mongoose";
import { createApp } from "./app.js";
import { MONGO_URI, PORT } from "./config/env.js";

const app = createApp();

// Connect once, then start listening.
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.error("Could not connect to MongoDB", err));

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
