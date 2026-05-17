import { describe, expect, it } from "vitest";
import { ClientSchema } from "@/schema/clientSchema";
import { sanitizeClientForDb } from "@/schema/sanitizeClient";
import { ClientSchemaKeys } from "@/schema/clientSchemaKeys";
import { fromSupabaseType, toApplicationType } from "@/types/api";

describe("Module 3: Anti-régression schéma", () => {

  // ─── Phase 1: Colonnes fantômes ───────────────────────────────────────────
  it("doit rejeter la colonne 'city'", () => {
    const result = sanitizeClientForDb({
      last_name: "Test",
      status: "prospect",
      city: "Paris",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).city).toBeUndefined();
    }
  });

  it("doit rejeter toute colonne inconnue", () => {
    const result = sanitizeClientForDb({
      last_name: "Test",
      status: "prospect",
      unknown_field: "value",
      another_bad_col: 123,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).unknown_field).toBeUndefined();
      expect((result.data as any).another_bad_col).toBeUndefined();
    }
  });

  it("doit rejeter 'ville' comme colonne inconnue", () => {
    const result = sanitizeClientForDb({
      last_name: "Test",
      status: "prospect",
      ville: "Lyon",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).ville).toBeUndefined();
    }
  });

  it("doit rejeter un payload vide", () => {
    const result = sanitizeClientForDb({});
    expect(result.success).toBe(false);
  });

  it("doit rejeter null/undefined", () => {
    expect(sanitizeClientForDb(null).success).toBe(false);
    expect(sanitizeClientForDb(undefined).success).toBe(false);
  });

  // ─── Phase 2: ClientSchema strict ─────────────────────────────────────────
  it("ClientSchema ne doit pas utiliser passthrough", () => {
    const shape = ClientSchema._def as any;
    expect(shape.typeName).toBe("ZodObject");
    // Vérification qu'aucun .passthrough() n'est utilisé
    const inner = ClientSchema as any;
    expect(inner._def?.catchall?.typeName).not.toBe("ZodNever");
  });

  it("ClientSchemaKeys doit correspondre aux clés du schéma", () => {
    const schemaKeys = Object.keys(ClientSchema.shape);
    expect(ClientSchemaKeys.sort()).toEqual(schemaKeys.sort());
  });

  it("doit accepter un payload valide minimum", () => {
    const result = sanitizeClientForDb({
      last_name: "Dupont",
      status: "prospect",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.last_name).toBe("Dupont");
      expect(result.data.status).toBe("prospect");
    }
  });

  // ─── Phase 3: Zéro spread policy ──────────────────────────────────────────
  it("ne doit pas propager de clés non-whitelist via spread", () => {
    // Simule un spread accidentel { ...externalPayload, last_name: "ok" }
    const externalData = { city: "Paris", ville: "Lyon", unknown_flag: true };

    const result = sanitizeClientForDb({
      ...externalData,
      last_name: "Test",
      status: "prospect",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).city).toBeUndefined();
      expect((result.data as any).ville).toBeUndefined();
      expect((result.data as any).unknown_flag).toBeUndefined();
    }
  });

  // ─── Phase 4: Voix AI / parseVoice → sanitize pipeline ────────────────────
  it("doit rejeter les champs générés par parseVoice non valides", () => {
    const voiceParsed = {
      name: "Le Comptoir",
      status: "prospect",
      statut_opportunite: "chaud",
      phone: "+33612345678",
      email: "contact@comptoir.fr",
      postal_code: "75011",
      canal_acquisition: "terrain",
      notes: "Prospection vocale",
    };

    const result = sanitizeClientForDb({
      last_name: voiceParsed.name,
      status: voiceParsed.status,
      statut_opportunite: voiceParsed.statut_opportunite,
      phone: voiceParsed.phone,
      email: voiceParsed.email,
      postal_code: voiceParsed.postal_code,
      canal_acquisition: voiceParsed.canal_acquisition,
      notes: voiceParsed.notes,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.last_name).toBe("Le Comptoir");
      expect(result.data.status).toBe("prospect");
    }
  });

  // ─── Phase 5: Sanitation toujours active ───────────────────────────────────
  it("doit logger les champs rejetés (vérification via console.warn)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    sanitizeClientForDb({
      last_name: "Test",
      status: "prospect",
      ghost_col: "should be logged",
    });

    expect(warnSpy).toHaveBeenCalledWith(
      "[CLIENT_SANITIZE_REJECT]",
      expect.any(String),
      expect.arrayContaining(["ghost_col"]),
    );
    warnSpy.mockRestore();
  });

  it("doit normaliser les chaînes vides en null", () => {
    const result = sanitizeClientForDb({
      last_name: "Test",
      status: "prospect",
      email: "",
      phone: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBeNull();
      expect(result.data.phone).toBeNull();
    }
  });
});
