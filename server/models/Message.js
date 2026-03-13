/**
 * @file Message.js
 * @author Alejandro Alvarado
 * @brief Create messages schema.
 *
 * @description
 * This file is responsible for creating the Mongoose schemas
 * through which the application is able to perform CRUD operations
 * on the database related to messaging. When the messaging component
 * is invoked, it also performs a write operation on the database through
 * the message schema provided here.
 */

import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    messageType: {
      type: String,
      enum: ["text", "file"],
      default: "text",
    },
    content: {
      type: String,
      required: /* c8 ignore next */ function () {
        return this.messageType === "text";
      },
    },
    fileUrl: {
      type: String,
      required: /* c8 ignore next */ function () {
        return this.messageType === "file";
      },
    },
  },
  {
    timestamps: true, // Automatically creates createdAt and updatedAt fields
  }
);

// Create indexes for efficient querying
messageSchema.index({ sender: 1, recipient: 1 });
messageSchema.index({ recipient: 1, sender: 1 });
messageSchema.index({ createdAt: -1 }); // For sorting by time

export const Message = mongoose.model("Message", messageSchema);
