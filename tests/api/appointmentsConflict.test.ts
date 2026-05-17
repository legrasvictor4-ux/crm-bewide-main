import { describe, it, expect } from "vitest";
import { detectConflicts, appointmentRequestSchema } from "@/backend/scheduling";

// ─── Tests unitaires purs (zéro HTTP, zéro serveur) ────────────────────────────
// Les 3 tests reproduisent EXACTEMENT les scénarios de appointmentsConflict.test.ts
// sans dépendance à localhost:3000, sans supertest, sans serveur Express.

describe("detectConflicts (pure function)", () => {
  it("detects time overlap", () => {
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

    const candidate = {
      title: "Nouveau",
      start: "2025-01-15T10:30:00.000Z",
      end: "2025-01-15T11:30:00.000Z",
      latitude: 48.85,
      longitude: 2.34,
    };

    const conflicts = detectConflicts(candidate, existing);
    expect(conflicts.some((c) => c.code === "TIME_OVERLAP")).toBe(true);
  });

  it("flags tight travel windows", () => {
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

    const candidate = {
      title: "Rdv B",
      start: "2025-01-15T09:05:00.000Z",
      end: "2025-01-15T10:00:00.000Z",
      latitude: 48.864716,
      longitude: 2.349014,
      bufferMinutes: 10,
    };

    const conflicts = detectConflicts(candidate, existing);
    expect(conflicts.some((c) => c.code === "TRAVEL_TOO_TIGHT")).toBe(true);
  });

  it("rejects invalid payloads (zod validation)", () => {
    const result = appointmentRequestSchema.safeParse({
      appointment: {
        title: "", // titre vide → invalide
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      // Vérifie que l'erreur contient un message sur le titre
      const titleError = result.error.issues.find((i) => i.path.includes("title"));
      expect(titleError).toBeDefined();
    }
  });
});
