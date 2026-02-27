import { vi, describe, it, expect, beforeEach } from "vitest";
import { verifyToken } from "../../middleware/AuthMiddleware.js";
import jwt from "jsonwebtoken";

vi.mock("jsonwebtoken", () => ({
  default: { verify: vi.fn() },
}));

// Middleware uses res.status(code).send(body) — no .json() needed here
const mockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.send = (body) => {
    res.body = body;
    return res;
  };
  return res;
};

describe("verifyToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no token is present in cookies", () => {
    const req = { cookies: {} };
    const res = mockRes();
    const next = vi.fn();

    verifyToken(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toBe("You are not authenticated!");
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when the token is present but invalid", () => {
    // Simulate jwt.verify calling the callback with an error
    jwt.verify.mockImplementation((token, key, cb) => {
      cb(new Error("invalid signature"), null);
    });

    const req = { cookies: { jwt: "bad_token" } };
    const res = mockRes();
    const next = vi.fn();

    verifyToken(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body).toBe("Token is not valid!");
    expect(next).not.toHaveBeenCalled();
  });

  it("sets req.userId and calls next() when the token is valid", () => {
    // Simulate jwt.verify calling the callback with a decoded payload
    jwt.verify.mockImplementation((token, key, cb) => {
      cb(null, { userId: "user123" });
    });

    const req = { cookies: { jwt: "valid_token" } };
    const res = mockRes();
    const next = vi.fn();

    verifyToken(req, res, next);

    expect(req.userId).toBe("user123");
    expect(next).toHaveBeenCalled();
    // No response should have been sent
    expect(res.statusCode).toBeUndefined();
  });
});
