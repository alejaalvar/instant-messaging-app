import { vi, describe, it, expect, beforeEach } from "vitest";
import {
  searchContacts,
  getAllContacts,
  getContactsForList,
  deleteDirectMessages,
} from "../../controllers/ContactsController.js";
import { User } from "../../models/User.js";
import { Message } from "../../models/Message.js";

vi.mock("../../models/User.js", () => ({
  User: { find: vi.fn() },
}));

vi.mock("../../models/Message.js", () => ({
  Message: { find: vi.fn(), deleteMany: vi.fn() },
}));

// Same mockRes helper as AuthController tests
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
  res.send = (body) => {
    res.body = body;
    return res;
  };
  return res;
};

// -------------------- searchContacts --------------------

describe("searchContacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when searchTerm is missing", async () => {
    const req = { userId: "user123", body: {} };
    const res = mockRes();

    await searchContacts(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: "Search term is required" });
  });

  it("returns 200 with matching contacts", async () => {
    const fakeUsers = [
      { _id: "abc1", firstName: "Alice", lastName: "Smith", email: "alice@example.com" },
      { _id: "abc2", firstName: "Bob", lastName: "Smith", email: "bob@example.com" },
    ];
    // User.find() is chained with .select() — mock the whole chain
    User.find.mockReturnValue({ select: vi.fn().mockResolvedValue(fakeUsers) });

    const req = { userId: "user123", body: { searchTerm: "smith" } };
    const res = mockRes();

    await searchContacts(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ contacts: fakeUsers });
  });

  it("returns 500 when the database throws an unexpected error", async () => {
    User.find.mockReturnValue({
      select: vi.fn().mockRejectedValue(new Error("DB failure")),
    });

    const req = { userId: "user123", body: { searchTerm: "smith" } };
    const res = mockRes();

    await searchContacts(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: "Internal Server Error" });
  });
});

// -------------------- getAllContacts --------------------

describe("getAllContacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with contacts formatted as label/value pairs", async () => {
    // _id needs .toString() because the controller calls user._id.toString()
    const fakeUsers = [
      { _id: { toString: () => "id1" }, firstName: "John", lastName: "Doe" },
      { _id: { toString: () => "id2" }, firstName: "Jane", lastName: "Doe" },
    ];
    User.find.mockReturnValue({ select: vi.fn().mockResolvedValue(fakeUsers) });

    const req = { userId: "user123" };
    const res = mockRes();

    await getAllContacts(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.contacts).toEqual([
      { label: "John Doe", value: "id1" },
      { label: "Jane Doe", value: "id2" },
    ]);
  });

  it('returns "No Name" label when firstName and lastName are both empty', async () => {
    // Covers the `|| "No Name"` fallback in the controller
    const fakeUsers = [
      { _id: { toString: () => "id1" }, firstName: "", lastName: "" },
    ];
    User.find.mockReturnValue({ select: vi.fn().mockResolvedValue(fakeUsers) });

    const req = { userId: "user123" };
    const res = mockRes();

    await getAllContacts(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.contacts[0].label).toBe("No Name");
  });

  it("returns 500 when the database throws an unexpected error", async () => {
    User.find.mockReturnValue({
      select: vi.fn().mockRejectedValue(new Error("DB failure")),
    });

    const req = { userId: "user123" };
    const res = mockRes();

    await getAllContacts(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: "Internal Server Error" });
  });
});

// -------------------- getContactsForList --------------------

describe("getContactsForList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with contacts built from messages (current user as sender)", async () => {
    const userId = "user123";
    const msgDate = new Date("2024-06-01");

    const otherUser = {
      _id: { toString: () => "other456" },
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      image: "",
      color: 1,
    };

    const messages = [
      {
        // Current user sent this message — contact is the recipient
        sender: { _id: { toString: () => userId } },
        recipient: otherUser,
        createdAt: msgDate,
      },
    ];

    // Chain: Message.find().sort().populate().populate() resolves to messages
    const populateMock = vi.fn().mockResolvedValue(messages);
    const firstPopulate = vi.fn().mockReturnValue({ populate: populateMock });
    const sortMock = vi.fn().mockReturnValue({ populate: firstPopulate });
    Message.find.mockReturnValue({ sort: sortMock });

    const req = { userId };
    const res = mockRes();

    await getContactsForList(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.contacts).toEqual([
      {
        _id: otherUser._id,
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        image: "",
        color: 1,
        lastMessageTime: msgDate,
      },
    ]);
  });

  it("returns 200 with contacts built from messages (current user as recipient)", async () => {
    const userId = "user123";
    const msgDate = new Date("2024-06-01");

    const otherUser = {
      _id: { toString: () => "other456" },
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      image: "",
      color: 1,
    };

    const messages = [
      {
        // Other user sent this message — contact is the sender
        sender: otherUser,
        recipient: { _id: { toString: () => userId } },
        createdAt: msgDate,
      },
    ];

    const populateMock = vi.fn().mockResolvedValue(messages);
    const firstPopulate = vi.fn().mockReturnValue({ populate: populateMock });
    const sortMock = vi.fn().mockReturnValue({ populate: firstPopulate });
    Message.find.mockReturnValue({ sort: sortMock });

    const req = { userId };
    const res = mockRes();

    await getContactsForList(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.contacts).toEqual([
      {
        _id: otherUser._id,
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        image: "",
        color: 1,
        lastMessageTime: msgDate,
      },
    ]);
  });

  it("returns 200 with an empty array when there are no messages", async () => {
    const populateMock = vi.fn().mockResolvedValue([]);
    const firstPopulate = vi.fn().mockReturnValue({ populate: populateMock });
    const sortMock = vi.fn().mockReturnValue({ populate: firstPopulate });
    Message.find.mockReturnValue({ sort: sortMock });

    const req = { userId: "user123" };
    const res = mockRes();

    await getContactsForList(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.contacts).toEqual([]);
  });

  it("deduplicates contacts when multiple messages exist between the same pair of users", async () => {
    const userId = "user123";
    const msgDate1 = new Date("2024-06-02"); // most recent
    const msgDate2 = new Date("2024-06-01");

    const otherUser = {
      _id: { toString: () => "other456" },
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      image: "",
      color: 1,
    };

    // Two messages with the same contact — the second should be skipped
    const messages = [
      { sender: { _id: { toString: () => userId } }, recipient: otherUser, createdAt: msgDate1 },
      { sender: { _id: { toString: () => userId } }, recipient: otherUser, createdAt: msgDate2 },
    ];

    const populateMock = vi.fn().mockResolvedValue(messages);
    const firstPopulate = vi.fn().mockReturnValue({ populate: populateMock });
    const sortMock = vi.fn().mockReturnValue({ populate: firstPopulate });
    Message.find.mockReturnValue({ sort: sortMock });

    const req = { userId };
    const res = mockRes();

    await getContactsForList(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.contacts).toHaveLength(1); // deduplicated
    expect(res.body.contacts[0].lastMessageTime).toEqual(msgDate1); // most recent
  });

  it("returns 500 when the database throws an unexpected error", async () => {
    const populateMock = vi.fn().mockRejectedValue(new Error("DB failure"));
    const firstPopulate = vi.fn().mockReturnValue({ populate: populateMock });
    const sortMock = vi.fn().mockReturnValue({ populate: firstPopulate });
    Message.find.mockReturnValue({ sort: sortMock });

    const req = { userId: "user123" };
    const res = mockRes();

    await getContactsForList(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: "Internal Server Error" });
  });
});

// -------------------- deleteDirectMessages --------------------

describe("deleteDirectMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when dmId is missing", async () => {
    // req.params with no dmId property — controller destructures it as undefined
    const req = { userId: "user123", params: {} };
    const res = mockRes();

    await deleteDirectMessages(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: "DM ID is required" });
  });

  it("returns 400 when dmId is not a valid ObjectId", async () => {
    const req = { userId: "user123", params: { dmId: "not-a-valid-id" } };
    const res = mockRes();

    await deleteDirectMessages(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: "Invalid DM ID" });
  });

  it("returns 200 with deletedCount on successful deletion", async () => {
    Message.deleteMany.mockResolvedValue({ deletedCount: 3 });

    // Use a valid 24-char hex ObjectId so the isValidObjectId guard passes
    const req = { userId: "user123", params: { dmId: "507f1f77bcf86cd799439011" } };
    const res = mockRes();

    await deleteDirectMessages(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ message: "DM deleted successfully", deletedCount: 3 });
  });

  it("returns 500 when the database throws an unexpected error", async () => {
    Message.deleteMany.mockRejectedValue(new Error("DB failure"));

    const req = { userId: "user123", params: { dmId: "507f1f77bcf86cd799439011" } };
    const res = mockRes();

    await deleteDirectMessages(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: "Internal Server Error" });
  });
});
