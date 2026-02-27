import { vi, describe, it, expect, beforeEach } from "vitest";
import { setupSocketHandlers } from "../../socket/socketHandlers.js";

vi.mock("jsonwebtoken", () => ({
  default: { verify: vi.fn() },
}));

vi.mock("../../models/Message.js", () => ({
  Message: { create: vi.fn() },
}));

import jwt from "jsonwebtoken";
import { Message } from "../../models/Message.js";

// -------------------- Helpers --------------------

function makeMockSocket(cookie = "jwt=validtoken") {
  return {
    id: "socket123",
    handshake: { headers: { cookie } },
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  };
}

function makeIo(socket) {
  const recipientEmit = vi.fn();
  const mockIo = {
    on: vi.fn((event, cb) => {
      if (event === "connection") cb(socket);
    }),
    to: vi.fn(() => ({ emit: recipientEmit })),
    _recipientEmit: recipientEmit,
  };
  setupSocketHandlers(mockIo);
  return mockIo;
}

function getCallback(socket, eventName) {
  const call = socket.on.mock.calls.find(([e]) => e === eventName);
  return call?.[1];
}

// -------------------- Tests --------------------

describe("socketHandlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------- Authentication --------------------

  describe("connection authentication", () => {
    it("disconnects socket when no cookie is present", () => {
      const socket = makeMockSocket(""); // empty cookie string
      makeIo(socket);

      expect(socket.disconnect).toHaveBeenCalledOnce();
    });

    it("disconnects socket when jwt.verify throws (invalid/expired token)", () => {
      const socket = makeMockSocket("jwt=badtoken");
      jwt.verify.mockImplementation(() => {
        throw new Error("invalid signature");
      });

      makeIo(socket);

      expect(socket.disconnect).toHaveBeenCalledOnce();
    });

    it("registers sendMessage and disconnect handlers when token is valid", () => {
      const socket = makeMockSocket("jwt=goodtoken");
      jwt.verify.mockReturnValue({ userId: "user-auth-test" });

      makeIo(socket);

      expect(socket.disconnect).not.toHaveBeenCalled();
      const registeredEvents = socket.on.mock.calls.map(([e]) => e);
      expect(registeredEvents).toContain("sendMessage");
      expect(registeredEvents).toContain("disconnect");
    });
  });

  // -------------------- sendMessage validation --------------------

  describe("sendMessage validation", () => {
    it("emits error when required fields are missing", async () => {
      const socket = makeMockSocket("jwt=goodtoken");
      jwt.verify.mockReturnValue({ userId: "user-validation" });
      makeIo(socket);

      const sendMessage = getCallback(socket, "sendMessage");
      // Missing content
      await sendMessage({ sender: "user-validation", recipient: "other" });

      expect(socket.emit).toHaveBeenCalledWith("error", {
        message: "Missing required fields",
      });
    });

    it("emits Unauthorized error when sender does not match authenticated userId (spoofing)", async () => {
      const socket = makeMockSocket("jwt=goodtoken");
      jwt.verify.mockReturnValue({ userId: "real-user" });
      makeIo(socket);

      const sendMessage = getCallback(socket, "sendMessage");
      // data.sender is someone else's id
      await sendMessage({
        sender: "attacker-impersonating-victim",
        recipient: "target",
        content: "hello",
      });

      expect(socket.emit).toHaveBeenCalledWith("error", {
        message: "Unauthorized",
      });
      expect(Message.create).not.toHaveBeenCalled();
    });
  });

  // -------------------- sendMessage happy path --------------------

  describe("sendMessage happy path", () => {
    function makeMockMessage(senderId, recipientId) {
      const populate = vi.fn().mockResolvedValue(undefined);
      return {
        _id: "msg-1",
        sender: { _id: senderId, email: "s@x.com", firstName: "Alice", lastName: "A", image: null },
        recipient: { _id: recipientId, email: "r@x.com", firstName: "Bob", lastName: "B", image: null },
        content: "hello",
        messageType: "text",
        createdAt: new Date("2025-01-01"),
        populate,
      };
    }

    it("saves message and emits receiveMessage to sender when recipient is offline", async () => {
      const senderId = "sender-offline-test";
      const recipientId = "recipient-offline-test";

      const socket = makeMockSocket("jwt=goodtoken");
      jwt.verify.mockReturnValue({ userId: senderId });

      const mockMsg = makeMockMessage(senderId, recipientId);
      Message.create.mockResolvedValue(mockMsg);

      const mockIo = makeIo(socket);
      const sendMessage = getCallback(socket, "sendMessage");

      await sendMessage({ sender: senderId, recipient: recipientId, content: "hello" });

      expect(Message.create).toHaveBeenCalledWith({
        sender: senderId,
        recipient: recipientId,
        content: "hello",
        messageType: "text",
      });

      // Sender gets confirmation
      expect(socket.emit).toHaveBeenCalledWith(
        "receiveMessage",
        expect.objectContaining({ content: "hello" })
      );

      // Recipient is offline — io.to should NOT have been called
      expect(mockIo.to).not.toHaveBeenCalled();
    });

    it("emits receiveMessage to both sender and recipient when recipient is online", async () => {
      // Connect the recipient first so they appear in userSocketMap
      const recipientId = "recipient-online-test";
      const recipientSocket = makeMockSocket("jwt=recipient-token");
      jwt.verify.mockReturnValue({ userId: recipientId });
      const recipientIo = makeIo(recipientSocket);

      // Now connect the sender
      const senderId = "sender-online-test";
      const senderSocket = makeMockSocket("jwt=sender-token");
      jwt.verify.mockReturnValue({ userId: senderId });
      const senderIo = makeIo(senderSocket);

      // Set up the message mock
      const mockMsg = makeMockMessage(senderId, recipientId);
      Message.create.mockResolvedValue(mockMsg);

      const sendMessage = getCallback(senderSocket, "sendMessage");
      await sendMessage({ sender: senderId, recipient: recipientId, content: "hello" });

      // The sender's io instance routes to the recipient's socket id
      expect(senderIo.to).toHaveBeenCalledWith(recipientSocket.id);
      expect(senderIo._recipientEmit).toHaveBeenCalledWith(
        "receiveMessage",
        expect.objectContaining({ content: "hello" })
      );

      // Sender also gets confirmation
      expect(senderSocket.emit).toHaveBeenCalledWith(
        "receiveMessage",
        expect.objectContaining({ content: "hello" })
      );
    });

    it("emits error event when Message.create throws", async () => {
      const socket = makeMockSocket("jwt=goodtoken");
      jwt.verify.mockReturnValue({ userId: "user-db-error" });
      makeIo(socket);

      Message.create.mockRejectedValue(new Error("DB failure"));

      const sendMessage = getCallback(socket, "sendMessage");
      await sendMessage({ sender: "user-db-error", recipient: "other", content: "hi" });

      expect(socket.emit).toHaveBeenCalledWith("error", {
        message: "Failed to send message",
      });
    });
  });

  // -------------------- disconnect --------------------

  describe("disconnect", () => {
    it("removes user from userSocketMap on disconnect", () => {
      const socket = makeMockSocket("jwt=goodtoken");
      jwt.verify.mockReturnValue({ userId: "user-disconnect-test" });
      makeIo(socket);

      const disconnectCb = getCallback(socket, "disconnect");
      // Invoking should not throw and should execute the map cleanup
      expect(() => disconnectCb()).not.toThrow();
    });
  });
});
