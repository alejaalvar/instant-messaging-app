import { User } from "../models/User.js";
import { Message } from "../models/Message.js";

// -------------------- Search Contacts --------------------
export const searchContacts = async (req, res) => {
  try {
    const { searchTerm } = req.body;

    // Validate searchTerm exists
    if (!searchTerm) {
      return res.status(400).json({ message: "Search term is required" });
    }

    // Search for users matching the searchTerm in firstName, lastName, or email
    // Use case-insensitive regex for partial matching
    // Exclude the current user from results
    const contacts = await User.find({
      $and: [
        { _id: { $ne: req.userId } }, // Exclude current user
        {
          $or: [
            { firstName: { $regex: searchTerm, $options: "i" } },
            { lastName: { $regex: searchTerm, $options: "i" } },
            { email: { $regex: searchTerm, $options: "i" } },
          ],
        },
      ],
    }).select("_id firstName lastName email"); // Only return necessary fields

    return res.status(200).json({ contacts });
  } catch (error) {
    console.error("Search contacts error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// -------------------- Get All Contacts --------------------
export const getAllContacts = async (req, res) => {
  try {
    // Get all users except the current user
    const users = await User.find(
      { _id: { $ne: req.userId } } // Exclude current user
    ).select("firstName lastName _id");

    // Format as { label: "Full Name", value: "userId" }
    const contacts = users.map((user) => ({
      label: `${user.firstName} ${user.lastName}`.trim() || "No Name",
      value: user._id.toString(),
    }));

    return res.status(200).json({ contacts });
  } catch (error) {
    console.error("Get all contacts error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// -------------------- Get Contacts For List (Sorted by Last Message) --------------------
export const getContactsForList = async (req, res) => {
  try {
    const userId = req.userId;

    // Get all messages where the user is either sender or recipient
    const messages = await Message.find({
      $or: [{ sender: userId }, { recipient: userId }],
    })
      .sort({ createdAt: -1 }) // Most recent first
      .populate("sender", "_id firstName lastName email image color")
      .populate("recipient", "_id firstName lastName email image color");

    // Build a map of contactId -> last message time
    const contactsMap = new Map();

    messages.forEach((message) => {
      // Determine who the contact is (the other person in the conversation)
      const contactId =
        message.sender._id.toString() === userId
          ? message.recipient._id.toString()
          : message.sender._id.toString();

      // Only add if this is the first (most recent) message with this contact
      if (!contactsMap.has(contactId)) {
        const contact =
          message.sender._id.toString() === userId
            ? message.recipient
            : message.sender;

        contactsMap.set(contactId, {
          _id: contact._id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          image: contact.image,
          color: contact.color,
          lastMessageTime: message.createdAt,
        });
      }
    });

    // Convert map to array (already sorted by lastMessageTime due to query sort)
    const contacts = Array.from(contactsMap.values());

    return res.status(200).json({ contacts });
  } catch (error) {
    console.error("Get contacts for list error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// -------------------- Delete Direct Messages --------------------
export const deleteDirectMessages = async (req, res) => {
  try {
    const { dmId } = req.params;
    const userId = req.userId;

    if (!dmId) {
      return res.status(400).json({ message: "DM ID is required" });
    }

    // Delete all messages between the current user and the target user
    const result = await Message.deleteMany({
      $or: [
        { sender: userId, recipient: dmId },
        { sender: dmId, recipient: userId },
      ],
    });

    console.log(`🗑️  Deleted ${result.deletedCount} messages between ${userId} and ${dmId}`);

    return res.status(200).json({
      message: "DM deleted successfully",
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error("Delete DM error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
