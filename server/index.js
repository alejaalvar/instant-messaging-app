import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 8747;
const DATABASE_URL = process.env.DATABASE_URL;

// ========================================
// MIDDLEWARE CONFIGURATION
// ========================================
app.use(cookieParser());
app.use(express.json());
app.use(cors({
  origin: process.env.ORIGIN,
  credentials: true
}));

// ========================================
// API ROUTES
// ========================================
app.use("/api/auth", authRoutes);

// TODO: Add more routes as you build features
// app.use("/api/contacts", contactsRoutes);
// app.use("/api/messages", messagesRoutes);

// ========================================
// DATABASE CONNECTION
// ========================================
mongoose
  .connect(DATABASE_URL)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ========================================
// START SERVER
// ========================================
app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
