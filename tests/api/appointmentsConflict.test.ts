import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../api-server.mjs";

const API_BASE = "http://localhost:3000";

describe("API /api/appointments/validate", () => {
  it("detects time overlap", async () => {
    const existing = [
      {
        id: "apt-1",
        title: "Rdv existant",
        start: "2025-01-15T10:00:00.000Z",
        end: "2025-01-15T11:00:00.000Z",
        latitude: 48.86,
        longitude: 2.35,
      },
    ];

    const res = await request(API_BASE).post("/api/appointments/validate").send({
      appointment: {
        title: "Nouveau",
        start: "2025-01-15T10:30:00.000Z",
        end: "2025-01-15T11:30:00.000Z",
        latitude: 48.85,
        longitude: 2.34,
      },
      existingAppointments: existing,
    });

    expect(res.status).toBe(200);
    expect(res.body.conflicts.some((c) => c.code === "TIME_OVERLAP")).toBe(true);
  });

  it("flags tight travel windows", async () => {
    const existing = [
      {
        id: "apt-2",
        title: "Rdv A",
        start: "2025-01-15T08:00:00.000Z",
        end: "2025-01-15T09:00:00.000Z",
        latitude: 48.8566,
        longitude: 2.3522,
      },
    ];

    const res = await request(API_BASE).post("/api/appointments/validate").send({
      appointment: {
        title: "Rdv B",
        start: "2025-01-15T09:05:00.000Z",
        end: "2025-01-15T10:00:00.000Z",
        latitude: 48.864716,
        longitude: 2.349014,
        bufferMinutes: 10,
      },
      existingAppointments: existing,
    });

    expect(res.status).toBe(200);
    expect(res.body.conflicts.some((c) => c.code === "TRAVEL_TOO_TIGHT")).toBe(true);
  });

  it("rejects invalid payloads", async () => {
    const res = await request(API_BASE).post("/api/appointments/validate").send({
      appointment: {
        title: "",
      },
    });
    expect(res.status).toBe(400);
  });
});
