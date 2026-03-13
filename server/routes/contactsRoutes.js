/**
 * @file contactsRoutes.js
 * @author Alejandro Alvarado
 * @brief Create a router for contact discovery/management.
 *
 * @description
 * This module is responsible for creating the router
 * responsible for contact discovery and management. Each
 * route corresponds to an API endpoint. This module is
 * also responsible for enforcing a strict access policy
 * of restricting unauthorized users (users without a JWT)
 * from accessing these endpoints. This ensures that other
 * users or bad actors cannot search the database for contacts,
 * see other users' contacts, or delete other users' messages.
 * This router is exported for the app.js module.
 */

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
