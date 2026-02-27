import { vi, describe, it, expect, beforeEach } from "vitest";
import { getMessages } from "../../controllers/MessagesController.js";
import { Message } from "../../models/Message.js";

vi.mock("../../models/Message.js", () => ({
  Message: { find: vi.fn() },
}));

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

// Helper: build the find().sort().populate().populate() mock chain
const mockFindChain = (resolvedValue) => {
  const populateMock = vi.fn().mockResolvedValue(resolvedValue);
  const firstPopulate = vi.fn().mockReturnValue({ populate: populateMock });
  const sortMock = vi.fn().mockReturnValue({ populate: firstPopulate });
  Message.find.mockReturnValue({ sort: sortMock });
};

describe("getMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when the other user's id is missing from the request body", async () => {
    const req = { userId: "user123", body: {} };
    const res = mockRes();

    await getMessages(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: "Both user IDs are required" });
  });

  it("returns 400 when userId (from auth middleware) is missing", async () => {
    // userId would be undefined if verifyToken didn't run / was bypassed
    const req = { body: { id: "other456" } };
    const res = mockRes();

    await getMessages(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: "Both user IDs are required" });
  });

  it("returns 200 with the messages array on success", async () => {
    const fakeMessages = [
      {
        _id: "msg1",
        sender: { _id: "user123", email: "user@example.com", firstName: "John", lastName: "Doe", image: "" },
        recipient: { _id: "other456", email: "other@example.com", firstName: "Jane", lastName: "Doe", image: "" },
        messageType: "text",
        content: "Hello!",
        createdAt: new Date("2024-01-01"),
      },
    ];

    mockFindChain(fakeMessages);

    const req = { userId: "user123", body: { id: "other456" } };
    const res = mockRes();

    await getMessages(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ messages: fakeMessages });
  });

  it("returns 500 when the database throws an unexpected error", async () => {
    const populateMock = vi.fn().mockRejectedValue(new Error("DB failure"));
    const firstPopulate = vi.fn().mockReturnValue({ populate: populateMock });
    const sortMock = vi.fn().mockReturnValue({ populate: firstPopulate });
    Message.find.mockReturnValue({ sort: sortMock });

    const req = { userId: "user123", body: { id: "other456" } };
    const res = mockRes();

    await getMessages(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: "Internal Server Error" });
  });
});
