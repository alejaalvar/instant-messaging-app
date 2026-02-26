import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { User } from "../models/User.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMMON_PASSWORDS = new Set(
  readFileSync(join(__dirname, "../data/common-passwords.txt"), "utf8")
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean)
);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// -------------------- Signup --------------------
export const signup = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Invalid input." });
    }

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." })
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Invalid email format." })
    }

    if (password.length < 12) {
      return res.status(400).json({ message: "Password must be at least 12 characters." });
    }

    if (COMMON_PASSWORDS.has(password)) {
      return res.status(400).json({ message: "Password is too common. Choose a more unique password." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ email, password: hashedPassword });

    const token = jwt.sign(
      { userId: newUser._id },
      process.env.JWT_KEY,
      { expiresIn: "3d" }
    );

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
        profileSetup: newUser.profileSetup,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// -------------------- Login --------------------
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Invalid input." });
    }

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Invalid email format." })
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const auth = await bcrypt.compare(password, user.password);
    if (!auth) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_KEY,
      { expiresIn: "3d" }
    );

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
        profileSetup: user.profileSetup,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// -------------------- Logout --------------------
export const logout = async (req, res) => {
  try {
    res.cookie("jwt", "", {
      maxAge: 1,
      secure: true,
      sameSite: "None",
    });
    return res.status(200).send("Logout successful.");
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).send("Internal Server Error");
  }
};

// -------------------- Update Profile --------------------
export const updateProfile = async (req, res) => {
  try {
    const { userId } = req;
    const { firstName, lastName, color } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).send("First Name and Last Name are required.");
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, color, profileSetup: true },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      image: updatedUser.image,
      profileSetup: updatedUser.profileSetup,
      color: updatedUser.color,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).send("Internal Server Error");
  }
};

// -------------------- Get User Info --------------------
export const getUserInfo = async (req, res) => {
  try {
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
    console.error("Get user info error:", error);
    return res.status(500).send("Internal Server Error");
  }
};
