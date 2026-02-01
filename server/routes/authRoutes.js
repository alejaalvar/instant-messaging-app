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
