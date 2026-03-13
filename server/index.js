/**
 * @file index.js
 * @author Alejandro Alvarado
 * @brief Connect to the database and start the server.
 *
 * @description
 * Processes the environment variables found in .env for setup.
 * Manages the server's connection to the MongoDB database.
 * Manages the server itself and fires it on the specified
 * port number inside of the .env file.
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import { server } from "./app.js";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 8747;
const DATABASE_URL = process.env.DATABASE_URL;

// ========================================
// ERROR HANDLING
// ========================================
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// ========================================
// DATABASE CONNECTION
// ========================================
mongoose
  .connect(DATABASE_URL)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ========================================
// START SERVER
// ========================================
server.on("listening", () => {
  const addr = server.address();
  console.log(`Server is LISTENING on ${addr.address}:${addr.port}`);
});

server.on("error", (error) => {
  console.error(`Server error:`, error);
  process.exit(1);
});

// necessary ip for railway
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listen() callback fired for port ${PORT}`);
});
