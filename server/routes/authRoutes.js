/**
 * @file authRoutes.js
 * @author Alejandro Alvarado
 * @brief Create a router for authentication.
 *
 * @description
 * This module is responsible for creating a router
 * for the authentication component. Each route corresponds
 * to an API endpoint. This module is also responsible
 * for enforcing an access policy that restricts
 * unauthorized users (users without a JWT) from accessing
 * the update profile and user info endpoints. It is
 * allowed for any user to access signup, login, and logout endpoints.
 * This router is exported for the app.js module.
 */

import { Router } from "express";
import {
  signup,
  login,
  logout,
  updateProfile,
  getUserInfo,
} from "../controllers/AuthController.js";
import { verifyToken } from "../middleware/AuthMiddleware.js";

const authRoutes = Router();

// Public routes
authRoutes.post("/signup", signup);
authRoutes.post("/login", login);
authRoutes.post("/logout", logout);

// Protected routes (require authentication)
authRoutes.post("/update-profile", verifyToken, updateProfile);
authRoutes.get("/userinfo", verifyToken, getUserInfo);

export default authRoutes;
