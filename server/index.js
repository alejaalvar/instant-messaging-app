import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { User } from "./models/User.js";

dotenv.config();
const app = express();

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(cors({ origin: process.env.ORIGIN, credentials: true }));

const PORT = process.env.PORT || 8747; // Define port from .env

// Connect to MongoDB and then start the server
mongoose.connect(process.env.DATABASE_URL) // Uses the variable from your .env
  .then(() => {
    console.log("✅ DB Connected");
    
    // This is the missing piece!
    app.listen(PORT, () => {
      console.log(`🚀 Server is running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error("❌ DB Connection Error:", err);
  });

// --- AUTH ROUTES ---

// Feature 1.1: Signup
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists (Spec requirement: handle duplicate emails)
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(409).json({ message: "User already exists" });

    // Hash password (Spec requirement: bcrypt)
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({ email, password: hashedPassword });

    // Generate JWT (Spec requirement: JWT & HTTP-only cookies)
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_KEY, { expiresIn: "3d" });

    res.cookie("jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // only true in production
      maxAge: 3 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      user: { id: newUser._id, email: newUser.email }
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Feature 1.2: Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    const auth = await bcrypt.compare(password, user.password);
    if (!auth) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_KEY, { expiresIn: "3d" });

    res.cookie("jwt", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None", // Required for cross-site cookies with Ngrok
      maxAge: 3 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      user: { id: user._id, email: user.email, username: user.username, avatar: user.avatar }
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
});