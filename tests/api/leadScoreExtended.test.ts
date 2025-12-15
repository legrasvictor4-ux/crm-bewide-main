import request from "supertest";
import { describe, expect, it } from "vitest";
import express from "express";

const app = express();
app.use(express.json());

const clients: Array<{ id: string; company: string; lead_score: number }> = [];

app.post("/api/clients", (req, res) => {
  const id = String(Date.now() + Math.random());
  const lead_score = Math.floor(Math.random() * 100);
  const client = { id, company: req.body.company ?? req.body.name ?? "Client", lead_score };
  clients.push(client);
  res.status(201).json({ success: true, client });
});

app.get("/api/clients/lead-score", (req, res) => {
  const minScore = Number(req.query.minScore ?? 0);
  const sorted = clients
    .filter((c) => c.lead_score >= minScore)
    .sort((a, b) => b.lead_score - a.lead_score);
  res.status(200).json({ clients: sorted });
});

describe("Lead score endpoint", () => {
  it("returns sorted clients by score desc", async () => {
    // Seed
    await request(app).post("/api/clients").send({ company: "A" });
    await request(app).post("/api/clients").send({ company: "B" });
    await request(app).post("/api/clients").send({ company: "C" });

    const res = await request(app).get("/api/clients/lead-score?limit=5");
    expect(res.status).toBe(200);
    expect(res.body.clients.length).toBeGreaterThanOrEqual(3);
    const scores = res.body.clients.map((c: any) => c.lead_score ?? 0);
    const sorted = [...scores].sort((a, b) => b - a);
    expect(scores).toEqual(sorted);
  });

  it("filters by minScore", async () => {
    const res = await request(app).get("/api/clients/lead-score?minScore=15");
    expect(res.status).toBe(200);
    const scores = res.body.clients.map((c: any) => c.lead_score ?? 0);
    expect(scores.every((s: number) => s >= 15)).toBe(true);
  });
});
