import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import { createServer } from "http";
import authRoutes from "./routes/authRoutes.js";
import contactsRoutes from "./routes/contactsRoutes.js";
import messagesRoutes from "./routes/messagesRoutes.js";
import { setupSocketHandlers } from "./socket/socketHandlers.js";

// Load environment variables
dotenv.config();

// Create Express app and HTTP server
const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 8747;
const DATABASE_URL = process.env.DATABASE_URL;

// ========================================
// MIDDLEWARE CONFIGURATION
// ========================================
// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path} from ${req.ip}`);
  next();
});

app.use(cookieParser());
app.use(express.json());

// CORS configuration - allow multiple origins
const allowedOrigins = [
  process.env.ORIGIN,
  "https://instant-messaging-app-production.up.railway.app",
  "https://cs314-chat-app.netlify.app",
  "http://localhost:3000",
  "http://localhost:5173", // Vite default port
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// ========================================
// SOCKET.IO CONFIGURATION
// ========================================
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// Setup Socket.IO event handlers
setupSocketHandlers(io);

// ========================================
// HEALTH CHECK (for Railway)
// ========================================
app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Instant Messaging API",
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// ========================================
// API ROUTES
// ========================================
app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactsRoutes);
app.use("/api/messages", messagesRoutes);

// ========================================
// ERROR HANDLING
// ========================================
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});

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
server.on("listening", () => {
  const addr = server.address();
  console.log(`✅ Server is LISTENING on ${addr.address}:${addr.port}`);
});

server.on("error", (error) => {
  console.error(`❌ Server error:`, error);
  process.exit(1);
});

// necessary ip for railway
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server listen() callback fired for port ${PORT}`);
});
