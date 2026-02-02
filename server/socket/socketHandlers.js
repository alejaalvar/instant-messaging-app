import jwt from "jsonwebtoken";
import { Message } from "../models/Message.js";

// Map to store userId -> socketId for online users
const userSocketMap = new Map();

export const setupSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log(`⚡ New socket connection: ${socket.id}`);

    // ========================================
    // AUTHENTICATION
    // ========================================
    // Extract userId from JWT cookie in the handshake
    const token = socket.handshake.headers.cookie
      ?.split("; ")
      .find((row) => row.startsWith("jwt="))
      ?.split("=")[1];

    if (!token) {
      console.log("❌ No JWT token found, disconnecting socket");
      socket.disconnect();
      return;
    }

    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_KEY);
      userId = decoded.userId;

      // Store user's socket connection
      userSocketMap.set(userId, socket.id);
      console.log(`✅ User ${userId} connected with socket ${socket.id}`);
    } catch (error) {
      console.log("❌ Invalid JWT token, disconnecting socket");
      socket.disconnect();
      return;
    }

    // ========================================
    // SEND MESSAGE EVENT
    // ========================================
    socket.on("sendMessage", async (data) => {
      try {
        const { sender, recipient, content, messageType = "text" } = data;

        // Validate required fields
        if (!sender || !recipient || !content) {
          socket.emit("error", { message: "Missing required fields" });
          return;
        }

        // Ensure the sender matches the authenticated user
        if (sender !== userId) {
          socket.emit("error", { message: "Unauthorized" });
          return;
        }

        // Save message to database
        const newMessage = await Message.create({
          sender,
          recipient,
          content,
          messageType,
        });

        // Populate sender and recipient details for the response
        await newMessage.populate("sender", "_id email firstName lastName image");
        await newMessage.populate("recipient", "_id email firstName lastName image");

        // Prepare message object to send
        const messageData = {
          _id: newMessage._id,
          sender: newMessage.sender,
          recipient: newMessage.recipient,
          content: newMessage.content,
          messageType: newMessage.messageType,
          timestamp: newMessage.createdAt,
        };

        // Emit to recipient (if online)
        const recipientSocketId = userSocketMap.get(recipient);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit("receiveMessage", messageData);
        }

        // Emit back to sender (confirmation)
        socket.emit("receiveMessage", messageData);

        console.log(`📨 Message sent from ${sender} to ${recipient}`);
      } catch (error) {
        console.error("Send message error:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // ========================================
    // DISCONNECT EVENT
    // ========================================
    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);

      // Remove user from online users map
      userSocketMap.delete(userId);
    });
  });
};
