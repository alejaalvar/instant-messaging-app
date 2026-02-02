import { User } from "../models/User.js";

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

    // TODO: This will need to join with Messages collection once you implement it
    // For now, return all users except self with mock lastMessageTime
    const contacts = await User.find(
      { _id: { $ne: userId } }
    ).select("_id firstName lastName email image color");

    // Add mock lastMessageTime for now (you'll replace this with actual message data)
    const contactsWithTime = contacts.map((contact) => ({
      _id: contact._id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      image: contact.image,
      color: contact.color,
      lastMessageTime: new Date(), // TODO: Get from actual last message
    }));

    // Sort by lastMessageTime (most recent first)
    contactsWithTime.sort(
      (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
    );

    return res.status(200).json({ contacts: contactsWithTime });
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

    // TODO: Once you implement the Messages model, delete all messages between
    // the current user and the target user (dmId)
    // For now, just return success

    // Example of what you'll do later:
    // await Message.deleteMany({
    //   $or: [
    //     { sender: userId, recipient: dmId },
    //     { sender: dmId, recipient: userId }
    //   ]
    // });

    return res.status(200).json({ message: "DM deleted successfully" });
  } catch (error) {
    console.error("Delete DM error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
