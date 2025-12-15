import request from "supertest";
import { describe, expect, it } from "vitest";
import express from "express";

const app = express();
app.use(express.json());

app.post("/api/auth/login", (req, res) => {
  const { email, password, provider } = req.body;
  if (provider) {
    return res.status(200).json({ token: "token-provider", email: `${provider}@example.com` });
  }
  if (!email || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }
  return res.status(200).json({ token: "token", email });
});

app.post("/api/auth/logout", (_req, res) => res.status(200).json({ success: true }));

describe("Authentication API", () => {
  it("issues token for email/password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "user@example.com",
      password: "secret",
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.email).toBe("user@example.com");
  });

  it("issues token for Google provider", async () => {
    const res = await request(app).post("/api/auth/login").send({
      provider: "google",
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.email).toContain("@example.com");
  });

  it("rejects missing credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it("logs out cleanly", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
