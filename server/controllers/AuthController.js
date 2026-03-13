/**
 * @file AuthController.js
 * @author Alejandro Alvarado
 * @brief Handle authentication-related request logic.
 *
 * @description
 * This module is responsible for handling the business
 * logic for all authentication endpoints: signup, login,
 * logout, update profile, and get user info. It validates
 * and sanitizes incoming request data, interacts with the
 * User model to read and write user records, manages JWT
 * creation and cookie attachment for session handling, and
 * returns appropriate HTTP responses to the client.
 */

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
    .filter(Boolean),
);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// First char must be a Unicode letter; remaining chars may be letters, hyphens, or apostrophes.
// Total length enforced separately (2–40 chars).
const NAME_REGEX = /^[\p{L}][\p{L}'\-]{1,39}$/u;

// -------------------- Signup --------------------

/**
 * Register a new user account.
 *
 * Validates the submitted email and password, checks for duplicate accounts,
 * hashes the password, creates the user record, and issues a signed JWT cookie
 * on success.
 *
 * @async
 * @param {import('express').Request}  req - Express request. Expects `{ email, password }` in `req.body`.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<void>} 201 with the new user object, or an error status with a message.
 */
export const signup = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Invalid input." });
    }

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    if (password.length < 12) {
      return res
        .status(400)
        .json({ message: "Password must be at least 12 characters." });
    }

    if (COMMON_PASSWORDS.has(password)) {
      return res.status(400).json({
        message: "Password is too common. Choose a more unique password.",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ email, password: hashedPassword });

    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_KEY, {
      expiresIn: "3d",
    });

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

/**
 * Authenticate an existing user.
 *
 * Validates credentials against the stored bcrypt hash and, on success, issues
 * a signed JWT cookie that keeps the user session alive for three days.
 *
 * @async
 * @param {import('express').Request}  req - Express request. Expects `{ email, password }` in `req.body`.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<void>} 200 with the user object, or an error status with a message.
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Invalid input." });
    }

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const auth = await bcrypt.compare(password, user.password);
    if (!auth) {
      return res.status(400).json({ message: "Invalid password." });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_KEY, {
      expiresIn: "3d",
    });

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

/**
 * Log out the current user.
 *
 * Clears the `jwt` cookie by overwriting it with an immediately-expiring
 * value, effectively ending the client session without touching the database.
 *
 * @async
 * @param {import('express').Request}  req - Express request.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<void>} 200 on success, or 500 on an unexpected error.
 */
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
    return res.status(500).json("Internal Server Error");
  }
};

// -------------------- Update Profile --------------------

/**
 * Update the authenticated user's profile information.
 *
 * Validates and sanitizes the supplied name fields, then persists the changes
 * (first name, last name, color, and `profileSetup: true`) to the User document.
 * The `userId` is injected by the auth middleware and is not read from the body.
 *
 * @async
 * @param {import('express').Request}  req - Express request. Expects `{ firstName, lastName, color }` in
 *   `req.body` and `req.userId` set by auth middleware.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<void>} 200 with the updated user object, or an error status with a message.
 */
export const updateProfile = async (req, res) => {
  try {
    const { userId } = req;
    const { firstName, lastName, color } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).send("First Name and Last Name are required.");
    }

    if (firstName.length < 2 || firstName.length > 40 ||
        lastName.length  < 2 || lastName.length  > 40) {
      return res.status(400).send("Name must be between 2 and 40 characters.");
    }

    if (!NAME_REGEX.test(firstName) || !NAME_REGEX.test(lastName)) {
      return res.status(400).send("Name contains invalid characters.");
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, color, profileSetup: true },
      { new: true, runValidators: true },
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

/**
 * Retrieve the authenticated user's profile.
 *
 * Looks up the user by the `userId` injected by auth middleware and returns
 * their public profile fields. Used by the client on page load to hydrate
 * session state without re-authenticating.
 *
 * @async
 * @param {import('express').Request}  req - Express request. Expects `req.userId` set by auth middleware.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<void>} 200 with the user object, 404 if not found, or 500 on error.
 */
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
