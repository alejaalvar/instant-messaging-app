import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load .env variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8747; // Define the port number (from environment variables or default 8747)

app.use(
  cors({
    origin: process.env.ORIGIN,  // limits reqs from the defined domain in .env
    credentials: true,  // allow cookies and auth headers
  })
);

app.use(express.json());

// New signup endpoint
app.post("/api/auth/signup", (req, res) => {
  // Extract user details from req.body
  const { email, password } = req.body;
  console.log("Signup request body:", req.body);

  res.status(201).json({
    message: "signup successful",
    user: { email: email }
  });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});