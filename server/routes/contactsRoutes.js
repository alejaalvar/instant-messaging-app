import { Router } from "express";
import {
  searchContacts,
  getAllContacts,
  getContactsForList,
  deleteDirectMessages,
} from "../controllers/ContactsController.js";
import { verifyToken } from "../middleware/AuthMiddleware.js";

const contactsRoutes = Router();

// Search for contacts by name or email
contactsRoutes.post("/search", verifyToken, searchContacts);

// Get all contacts (formatted as label/value pairs)
contactsRoutes.get("/all-contacts", verifyToken, getAllContacts);

// Get contacts sorted by last message time (for chat list)
contactsRoutes.get("/get-contacts-for-list", verifyToken, getContactsForList);

// Delete direct messages with a specific user
contactsRoutes.delete("/delete-dm/:dmId", verifyToken, deleteDirectMessages);

export default contactsRoutes;