import { describe, it, expect } from "vitest";
import request from "supertest";

const API_BASE = "http://localhost:3000";

describe("API /api/appointments/plan", () => {
  it("orders by opportunity score then proximity", async () => {
    const res = await request(API_BASE).post("/api/appointments/plan").send({
      date: "2025-01-15",
      startLocation: { latitude: 48.8566, longitude: 2.3522, label: "Paris centre" },
      appointments: [
        {
          id: "high-west",
          title: "Score 9 Ouest",
          start: "2025-01-15T09:00:00.000Z",
          end: "2025-01-15T10:00:00.000Z",
          latitude: 48.86,
          longitude: 2.33,
          opportunityScore: 9,
        },
        {
          id: "high-east",
          title: "Score 9 Est",
          start: "2025-01-15T11:00:00.000Z",
          end: "2025-01-15T12:00:00.000Z",
          latitude: 48.857,
          longitude: 2.37,
          opportunityScore: 9,
        },
        {
          id: "mid",
          title: "Score 6",
          start: "2025-01-15T13:00:00.000Z",
          end: "2025-01-15T14:00:00.000Z",
          latitude: 48.90,
          longitude: 2.35,
          opportunityScore: 6,
        },
      ],
    });

    expect(res.status).toBe(200);
    const order = res.body.plan.map((p) => p.id);
    expect(order[0]).toBe("high-west");
    expect(order[1]).toBe("high-east");
    expect(order[2]).toBe("mid");
    expect(res.body.requiresUserValidation).toBe(true);
    expect(res.body.plan[0].reason).toMatch(/Score 9/);
  });

  it("returns warning when no appointments on date", async () => {
    const res = await request(API_BASE).post("/api/appointments/plan").send({
      date: "2025-01-16",
      appointments: [
        {
          id: "other-day",
          title: "Autre jour",
          start: "2025-01-17T09:00:00.000Z",
          end: "2025-01-17T10:00:00.000Z",
          opportunityScore: 5,
        },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.plan).toEqual([]);
    expect(res.body.warnings?.length).toBeGreaterThan(0);
  });
});
