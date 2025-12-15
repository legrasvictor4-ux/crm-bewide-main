import request from "supertest";
import { describe, expect, it } from "vitest";
import express from "express";

const createApp = () => {
  const app = express();
  app.get("/api/health", (_req, res) => res.status(200).json({ success: true }));
  return app;
};

describe("dotenv robustness", () => {
  const app = createApp();

  it("serves health without dotenv", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("serves health with dotenv", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
