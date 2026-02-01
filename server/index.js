import express, { Router } from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { User } from "./models/User.js";
import { verifyToken } from "./middleware/AuthMiddleware.js";

dotenv.config();  // load in env vars
const app = express();  // create our app
const DATABASE_URL = process.env.DATABASE_URL;

// ----- Middleware To Enable Cors -----
app.use(cookieParser());
app.use(express.json());
app.use(cors({ origin: process.env.ORIGIN, credentials: true }));

const PORT = process.env.PORT || 8747; // Define port from .env

// ----- Connect to MongoDB && start the server -----
// mongoose.connect(process.env.DATABASE_URL)
//   .then(() => {
//     console.log("✅ DB Connected");
    
//     app.listen(PORT, () => {
//       console.log(`🚀 Server is running at http://localhost:${PORT}`);
//     });
//   })
//   .catch(err => {
//     console.error("❌ DB Connection Error:", err);
//   });

// ----- AUTH ROUTES -----

const signup = async (req, res) => {
    try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(409).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ email, password: hashedPassword });

    const token = jwt.sign({ userId: newUser._id }, 
                           process.env.JWT_KEY, 
                           { expiresIn: "3d" });

    res.cookie("jwt", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 3 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      user: { 
        id: newUser._id, 
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        image: newUser.image,
        profileSetup: newUser.profileSetup 
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const login = async (req, res) => {
    try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    const auth = await bcrypt.compare(password, user.password);
    if (!auth) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_KEY, { expiresIn: "3d" });

    res.cookie("jwt", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 3 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      user: { 
        id: user._id, 
        email: user.email, 
        firstName: user.firstName, 
        lastName: user.lastName, 
        image: user.image, 
        profileSetup: user.profileSetup 
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const logout = async (req, res) => {
    try {
    // Clear the cookie by setting its expiry to a past date
    res.cookie("jwt", "", { 
      maxAge: 1, 
      secure: true, 
      sameSite: "None" 
    });
    return res.status(200).send("Logout successful.");
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};

const updateProfile = async (req, res) => {
    try {
    const { userId } = req;
    const { firstName, lastName, color } = req.body; // New field names from spec

    if (!firstName || !lastName) {
      return res.status(400).send("First Name and Last Name are required.");
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, color, profileSetup: true }, // Save new fields
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      image: updatedUser.image,
      profileSetup: updatedUser.profileSetup,
      color: updatedUser.color
    });
  } catch (error) {
    return res.status(500).send("Internal Server Error");
  }
};

const getUserInfo = async (req, res) => {
    try {
    // req.userId comes from the verifyToken middleware
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).send("User not found.");
    }

    return res.status(200).json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      image: user.image,
      color: user.color,
      profileSetup: user.profileSetup,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};

const authRoutes = Router();
app.use("/api/auth", authRoutes);

authRoutes.post("/signup", signup);
authRoutes.post("/login", login);
authRoutes.post("/logout", logout);
authRoutes.post("/update-profile", verifyToken, updateProfile);
authRoutes.get("/userinfo", verifyToken, getUserInfo);

// Connect to MongoDB using Mongoose
mongoose
  .connect(DATABASE_URL)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:",
                                err));

// Start the Express server and listen on the specified port
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});