import { Router } from "express";
import { getMessages } from "../controllers/MessagesController.js";
import { verifyToken } from "../middleware/AuthMiddleware.js";

const messagesRoutes = Router();

// Get message history between current user and another user
messagesRoutes.post("/get-messages", verifyToken, getMessages);

export default messagesRoutes;
