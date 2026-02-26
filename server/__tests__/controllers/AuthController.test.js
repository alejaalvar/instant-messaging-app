import { describe, it, expect } from "vitest";
import { signup, login } from "../../controllers/AuthController.js";

// Creates a fake Express res object that records what was called on it
const mockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
};

describe("signup", () => {
  it("returns 400 when email is not a string (NoSQL injection guard)", async () => {
    const req = { body: { email: { $gt: "" }, password: "validpassword123!" } };
    const res = mockRes();

    await signup(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: "Invalid input." });
  });

  it("returns 400 when email format is invalid", async () => {
    const req = {
      body: { email: "notanemail", password: "validpassword123!" },
    };
    const res = mockRes();

    await signup(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: "Invalid email format." });
  });

  it("returns 400 when email is missing (empty string)", async () => {
    const req = { body: { email: "", password: "validpassword123!" } };
    const res = mockRes();

    await signup(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: "Email and password are required." });
  });

  it("returns 400 when password is in the common passwords list", async () => {
    const req = { body: { email: "test@gmail.com", password: "123456789123" } };
    const res = mockRes();

    await signup(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      message: "Password is too common. Choose a more unique password.",
    });
  });
});
