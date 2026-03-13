/**
 * @file messagesRoutes.js
 * @author Alejandro Alvarado
 * @brief Create a router for getting message history.
 *
 * @description
 * This module is responsible for creating the router
 * object that sets up the API endpoint for getting
 * message history. This is invoked when displaying the
 * chat history between two users. This module is also
 * responsible for enforcing the access policy of
 * restricting unauthorized users (users without a JWT)
 * from accessing the message history endpoint. This
 * keeps users' chat history private and secure.
 * This router is exported for the app.js module.
 */

import { Router } from "express";
import { getMessages } from "../controllers/MessagesController.js";
import { verifyToken } from "../middleware/AuthMiddleware.js";

const messagesRoutes = Router();

// Get message history between current user and another user
messagesRoutes.post("/get-messages", verifyToken, getMessages);

export default messagesRoutes;
