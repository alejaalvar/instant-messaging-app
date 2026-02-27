import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../app.js";

// -------------------- Health Endpoints --------------------

describe("health endpoints", () => {
  it("GET / returns 200 with status ok", async () => {
    const res = await request(app).get("/");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.message).toBe("Instant Messaging API");
  });

  it("GET /health returns 200 with status ok", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

// -------------------- CORS --------------------

describe("CORS", () => {
  it("allows requests with no Origin header (Postman, curl)", async () => {
    const res = await request(app).get("/health");
    // No Origin → allowed; no CORS header needed
    expect(res.status).toBe(200);
  });

  it("allows requests from a whitelisted origin and sets the ACAO header", async () => {
    const res = await request(app)
      .get("/health")
      .set("Origin", "http://localhost:5173");

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("blocks requests from a non-whitelisted origin", async () => {
    const res = await request(app)
      .get("/health")
      .set("Origin", "https://evil-site.com");

    // cors() passes the error to Express → default 500 handler
    expect(res.status).toBe(500);
  });
});
