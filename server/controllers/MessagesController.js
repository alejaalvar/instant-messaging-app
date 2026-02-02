import { Message } from "../models/Message.js";

// -------------------- Get Messages --------------------
export const getMessages = async (req, res) => {
  try {
    const { id } = req.body; // The other user's ID
    const userId = req.userId; // Current user's ID from verifyToken middleware

    if (!userId || !id) {
      return res.status(400).json({ message: "Both user IDs are required" });
    }

    // Find all messages between the two users (in both directions)
    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: id },
        { sender: id, recipient: userId },
      ],
    })
      .sort({ createdAt: 1 }) // Sort oldest to newest (chronological order)
      .populate("sender", "_id email firstName lastName image")
      .populate("recipient", "_id email firstName lastName image");

    return res.status(200).json({ messages });
  } catch (error) {
    console.error("Get messages error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
