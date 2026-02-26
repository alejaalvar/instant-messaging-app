import { vi, describe, it, expect, beforeEach } from "vitest";
import { signup, login } from "../../controllers/AuthController.js";
import { User } from "../../models/User.js";
import bcrypt from "bcrypt";

// Replace the real User model with a fake for this entire file.
// AuthController imports User from this same path, so it gets the fake too.
vi.mock("../../models/User.js", () => ({
  User: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

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

describe("signup - validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
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

  it("it returns 400 when password is shorter than 12 characters", async () => {
    const req = { body: { email: "test@gmail.com", password: "123" } };
    const res = mockRes();

    await signup(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      message: "Password must be at least 12 characters.",
    });
  });
});

describe("signup - database layer", () => {
  beforeEach(() => {
    vi.clearAllMocks(); // reset mock state before each test
  });

  it("returns 409 when user already exists", async () => {
    // Make findOne pretend it found a user in the DB
    User.findOne.mockResolvedValue({
      // mockResolvedvalue "presets" the resolved promise essentially
      _id: "abc123",
      email: "test@example.com",
    });

    const req = {
      body: { email: "test@example.com", password: "Xk9mLpQ7rNvW" },
    };
    const res = mockRes();

    await signup(req, res);

    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({ message: "User already exists" });
  });
});

describe("login - database layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when user is not found", async () => {
    // Make findOne pretend it did not find a user in the DB
    User.findOne.mockResolvedValue(null);

    const req = {
      body: { email: "test@example.com", password: "Xk9mLpQ7rNvW" },
    };
    const res = mockRes();

    await login(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ message: "User not found." });
  });

  it("returns 400 when password is incorrect", async () => {
    // Make findOne return fake user with a password field
    // Configure our mock
    User.findOne.mockResolvedValue({
      _id: "abc123",
      email: "test@example.com",
      password: "some_hashed_string_doesnt_matter",
    });
    // Configure the mock
    bcrypt.compare.mockResolvedValue(false);

    const req = {
      body: { email: "test@example.com", password: "incorrect_password" },
    };

    const res = mockRes();

    await login(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: "Invalid password." });
  });

  it("returns 400 when email is not a string", async () => {
    const req = {
      body: { email: 1234, password: "Xk9mLpQ7rNvW" },
    };

    const res = mockRes();

    await login(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: "Invalid input." });
  });

  it("returns 400 when email format is invalid", async () => {
    const req = {
      body: { email: "invalidformatatemail.com", password: "Xk9mLpQ7rNvW" },
    };

    const res = mockRes();

    await login(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: "Invalid email format." });
  });

  it("returns 400 when emaila and password are missing", async () => {
    const req = { body: { email: "", password: "" } };
    const res = mockRes();

    await login(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: "Email and password are required." });
  });
});
