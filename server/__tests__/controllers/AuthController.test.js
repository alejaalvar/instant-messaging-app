import { vi, describe, it, expect, beforeEach } from "vitest";
import { signup, login, logout, updateProfile, getUserInfo } from "../../controllers/AuthController.js";
import { User } from "../../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Replace the real User model with a fake for this entire file.
// AuthController imports User from this same path, so it gets the fake too.
vi.mock("../../models/User.js", () => ({
  User: {
    findOne: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn(),
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
  res.cookie = (name, value) => {
    res.cookieName = name;
    res.cookieValue = value;
    return res;
  };
  res.send = (body) => {
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

  it("returns 500 when when database throws an unexpected error", async () => {
    User.findOne.mockRejectedValue(new Error("DB failure"));

    const req = {
      body: { email: "test@example.com", password: "Xk9mLpQ7rNvW" },
    };
    const res = mockRes();

    await signup(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: "Internal Server Error" });
  });

  it("returns 201 on successful signup", async () => {
    User.findOne.mockResolvedValue(null);

    User.create.mockResolvedValue({
      _id: "abc123",
      email: "test@example.com",
      password: "some_hashed_string",
      firstName: "John",
      lastName: "Doe",
      image: "",
      profileSetup: false,
    });

    jwt.sign.mockReturnValue("fake_token");

    const req = {
      body: { email: "test@example.com", password: "Xk9mLpQ7rNvW" },
    };
    const res = mockRes();

    await signup(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.user).toEqual({
      id: "abc123",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      image: "",
      profileSetup: false,
    });
    expect(res.cookieValue).toBe("fake_token");
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
});

describe("login - validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("returns 400 when email and password are missing", async () => {
    const req = { body: { email: "", password: "" } };
    const res = mockRes();

    await login(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: "Email and password are required." });
  });

  it("returns 500 when when database throws an unexpected error", async () => {
    User.findOne.mockRejectedValue(new Error("DB failure"));

    const req = {
      body: { email: "test@example.com", password: "Xk9mLpQ7rNvW" },
    };
    const res = mockRes();

    await login(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: "Internal Server Error" });
  });

  it("returns 200 on successful login", async () => {
    User.findOne.mockResolvedValue({
      _id: "abc123",
      email: "test@example.com",
      password: "some_hashed_string",
      firstName: "John",
      lastName: "Doe",
      image: "",
      profileSetup: false,
    });
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue("fake_token");

    const req = {
      body: { email: "test@example.com", password: "Xk9mLpQ7rNvW" },
    };
    const res = mockRes();

    await login(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.user).toEqual({
      id: "abc123",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      image: "",
      profileSetup: false,
    });
    expect(res.cookieValue).toBe("fake_token");
  });

});

describe("logout", () => {
  it("returns 200 on successful logout", async () => {
    const req = {};
    const res = mockRes();

    await logout(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe("Logout successful.");
    expect(res.cookieValue).toBe("");
  });
});

describe("updateProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when firstName or lastName is missing", async () => {
    // req.userId comes from auth middleware, not req.body
    const req = { userId: "abc123", body: { firstName: "", lastName: "Doe" } };
    const res = mockRes();

    await updateProfile(req, res);

    // Controller uses res.send() here, so res.body is a plain string
    expect(res.statusCode).toBe(400);
    expect(res.body).toBe("First Name and Last Name are required.");
  });

  it("returns 200 on successful profile update", async () => {
    User.findByIdAndUpdate.mockResolvedValue({
      id: "abc123",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      image: "",
      profileSetup: true,
      color: 1,
    });

    const req = {
      userId: "abc123",
      body: { firstName: "John", lastName: "Doe", color: 1 },
    };
    const res = mockRes();

    await updateProfile(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      id: "abc123",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      image: "",
      profileSetup: true,
      color: 1,
    });
  });

  it("returns 500 when database throws an unexpected error", async () => {
    User.findByIdAndUpdate.mockRejectedValue(new Error("DB failure"));

    const req = {
      userId: "abc123",
      body: { firstName: "John", lastName: "Doe", color: 1 },
    };
    const res = mockRes();

    await updateProfile(req, res);

    // Controller uses res.send() for 500, so res.body is a plain string
    expect(res.statusCode).toBe(500);
    expect(res.body).toBe("Internal Server Error");
  });
});

describe("getUserInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when user is not found", async () => {
    User.findById.mockResolvedValue(null);

    // req.userId comes from auth middleware
    const req = { userId: "abc123" };
    const res = mockRes();

    await getUserInfo(req, res);

    // Controller uses res.send() for 404, so res.body is a plain string
    expect(res.statusCode).toBe(404);
    expect(res.body).toBe("User not found.");
  });

  it("returns 200 with user data on success", async () => {
    User.findById.mockResolvedValue({
      id: "abc123",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      image: "",
      color: 1,
      profileSetup: true,
    });

    const req = { userId: "abc123" };
    const res = mockRes();

    await getUserInfo(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      id: "abc123",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      image: "",
      color: 1,
      profileSetup: true,
    });
  });

  it("returns 500 when database throws an unexpected error", async () => {
    User.findById.mockRejectedValue(new Error("DB failure"));

    const req = { userId: "abc123" };
    const res = mockRes();

    await getUserInfo(req, res);

    // Controller uses res.send() for 500, so res.body is a plain string
    expect(res.statusCode).toBe(500);
    expect(res.body).toBe("Internal Server Error");
  });
});
