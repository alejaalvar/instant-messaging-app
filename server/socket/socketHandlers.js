/**
 * @file socketHandlers.js
 * @author Alejandro Alvarado
 * @brief Setup web socket handlers.
 *
 * @description
 * This module receives a web socket (passed
 * in from the app.js module) and sets up the
 * handlers for each possible event: a new connection
 * is received (store that info in a hash map for efficient
 * lookups), a send message event is received (validate and
 * write it to the database), or a disconnect event is received
 * (remove the user from the hash map).
 */

import jwt from "jsonwebtoken";
import { Message } from "../models/Message.js";

// Map to store userId -> socketId for online users
const userSocketMap = new Map();

/**
 * Attach all Socket.IO event handlers to the server instance.
 *
 * On each new connection the JWT cookie is extracted from the handshake headers
 * and verified. Unauthenticated or tampered connections are immediately
 * disconnected. Authenticated sockets are tracked in `userSocketMap` so that
 * messages can be routed to online users in O(1) time.
 *
 * Registers the following socket events per connection:
 * - `sendMessage`  — persist a new DM and fan it out to sender and recipient.
 * - `disconnect`   — remove the user's entry from `userSocketMap`.
 *
 * @param {import('socket.io').Server} io - The Socket.IO server instance.
 * @returns {void}
 */
export const setupSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log(`New socket connection: ${socket.id}`);

    // ========================================
    // AUTHENTICATION
    // ========================================
    // Extract userId from JWT cookie in the handshake
    const token = socket.handshake.headers.cookie
      ?.split("; ")
      .find((row) => row.startsWith("jwt="))
      ?.split("=")[1];

    if (!token) {
      console.log("No JWT token found, disconnecting socket");
      socket.disconnect();
      return;
    }

    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_KEY);
      userId = decoded.userId;

      // Store user's socket connection
      userSocketMap.set(userId, socket.id);
      console.log(`User ${userId} connected with socket ${socket.id}`);
    } catch (error) {
      console.log("Invalid JWT token, disconnecting socket");
      socket.disconnect();
      return;
    }

    // ========================================
    // SEND MESSAGE EVENT
    // ========================================
    /**
     * Handle an outgoing direct message from the authenticated user.
     *
     * Validates that all required fields are present and that the claimed sender
     * matches the socket's authenticated `userId` to prevent spoofing. The message
     * is persisted to MongoDB and then emitted as a `receiveMessage` event to both
     * the recipient (if online) and the sender (as a delivery confirmation).
     *
     * @event sendMessage
     * @param {{ sender: string, recipient: string, content: string, messageType?: string }} data
     */
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
        await newMessage.populate(
          "sender",
          "_id email firstName lastName image",
        );
        await newMessage.populate(
          "recipient",
          "_id email firstName lastName image",
        );

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

        console.log(`Message sent from ${sender} to ${recipient}`);
      } catch (error) {
        console.error("Send message error:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // ========================================
    // DISCONNECT EVENT
    // ========================================
    /**
     * Handle a socket disconnection.
     *
     * Removes the user's entry from `userSocketMap` so that subsequent messages
     * addressed to this user are not routed to a stale socket ID.
     *
     * @event disconnect
     */
    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);

      // Remove user from online users map
      userSocketMap.delete(userId);
    });
  });
};
