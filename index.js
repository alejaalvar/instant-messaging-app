import express from "express";
import cors from "cors";

const app = express();
const PORT = 8747;

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
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