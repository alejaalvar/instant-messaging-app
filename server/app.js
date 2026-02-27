import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import { createServer } from "http";
import authRoutes from "./routes/authRoutes.js";
import contactsRoutes from "./routes/contactsRoutes.js";
import messagesRoutes from "./routes/messagesRoutes.js";
import { setupSocketHandlers } from "./socket/socketHandlers.js";

const app = express();
const server = createServer(app);

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
export const allowedOrigins = [
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

setupSocketHandlers(io);

// ========================================
// HEALTH CHECK (for Railway)
// ========================================
app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Instant Messaging API",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// ========================================
// API ROUTES
// ========================================
// Limit auth endpoints to 20 requests per 15 minutes to slow brute-force attacks
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/contacts", contactsRoutes);
app.use("/api/messages", messagesRoutes);

export { app, server };
