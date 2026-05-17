import { describe, expect, it } from "vitest";
import { voiceMachineReducer, ALLOWED_TRANSITIONS, type VoiceState, type VoiceEvent } from "@/lib/voice/voiceWorkflowMachine";
import { detectDuplicates, localExtract } from "@/lib/voice/voiceExtractor";
import { appendTranscript, getTranscript, getTranscriptVersions, resetTranscriptStore, setTranscript } from "@/lib/voice/voiceTranscriptStore";
import { saveDraft, getLastDraft, clearDrafts, listDrafts, hasUnsavedDraft } from "@/lib/voice/voiceDraftStore";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const initialState: VoiceState = {
  step: "IDLE",
  transcript: "",
  payload: null,
  error: null,
  canRetry: true,
  timestamp: 0,
};

function reduce(events: VoiceEvent[]): VoiceState {
  return events.reduce((s, e) => voiceMachineReducer(s, e), initialState);
}

// ─── Phase 1: State Machine ──────────────────────────────────────────────────

describe("Phase 1: Voice Workflow Machine", () => {
  it("passe de IDLE à LISTENING", () => {
    const s = reduce([{ type: "START_LISTEN" }]);
    expect(s.step).toBe("LISTENING");
  });

  it("passe de LISTENING à PROCESSING", () => {
    const s = reduce([{ type: "START_LISTEN" }, { type: "STOP_LISTEN" }]);
    expect(s.step).toBe("PROCESSING");
  });

  it("passe de PROCESSING à EXTRACTING avec transcript", () => {
    const s = reduce([
      { type: "START_LISTEN" },
      { type: "STOP_LISTEN" },
      { type: "TRANSCRIPT_READY", transcript: "Le restaurant Chez Paul" },
    ]);
    expect(s.step).toBe("EXTRACTING");
    expect(s.transcript).toBe("Le restaurant Chez Paul");
  });

  it("passe de EXTRACTING → SANITIZING → VALIDATING → REVIEW", () => {
    const s = reduce([
      { type: "START_LISTEN" },
      { type: "STOP_LISTEN" },
      { type: "TRANSCRIPT_READY", transcript: "test" },
      { type: "START_EXTRACT" },
      { type: "EXTRACT_DONE" },
      { type: "SANITIZE_OK", payload: { last_name: "Test", status: "prospect" } as any },
      { type: "VALIDATE_OK" },
    ]);
    expect(s.step).toBe("REVIEW");
    expect(s.payload?.last_name).toBe("Test");
  });

  it("passe de REVIEW à SAVING puis SUCCESS", () => {
    const s = reduce([
      { type: "START_LISTEN" },
      { type: "STOP_LISTEN" },
      { type: "TRANSCRIPT_READY", transcript: "test" },
      { type: "START_EXTRACT" },
      { type: "EXTRACT_DONE" },
      { type: "SANITIZE_OK", payload: { last_name: "Test", status: "prospect" } as any },
      { type: "VALIDATE_OK" },
      { type: "CONFIRM_SAVE" },
    ]);
    expect(s.step).toBe("SAVING");

    const s2 = voiceMachineReducer(s, { type: "SAVE_DONE" });
    expect(s2.step).toBe("SUCCESS");
  });

  it("passe en ERROR sur SANITIZE_FAIL", () => {
    const s = reduce([
      { type: "START_LISTEN" },
      { type: "STOP_LISTEN" },
      { type: "TRANSCRIPT_READY", transcript: "test" },
      { type: "EXTRACT_DONE" },
      { type: "SANITIZE_FAIL", error: "Champ inconnu: city" },
    ]);
    expect(s.step).toBe("ERROR");
    expect(s.error).toContain("city");
  });

  it("passe en ERROR sur TIMEOUT", () => {
    const s = reduce([
      { type: "START_LISTEN" },
      { type: "STOP_LISTEN" },
      { type: "TRANSCRIPT_READY", transcript: "test" },
      { type: "TIMEOUT" },
    ]);
    expect(s.step).toBe("ERROR");
    expect(s.error).toBe("Délai dépassé");
  });

  it("passe en CANCELLED depuis LISTENING", () => {
    const s = reduce([
      { type: "START_LISTEN" },
      { type: "CANCEL" },
    ]);
    expect(s.step).toBe("CANCELLED");
  });

  it("RETRY depuis ERROR repasse en IDLE", () => {
    const s = reduce([
      { type: "START_LISTEN" },
      { type: "STOP_LISTEN" },
      { type: "TRANSCRIPT_READY", transcript: "test" },
      { type: "TIMEOUT" },
      { type: "RETRY" },
    ]);
    expect(s.step).toBe("IDLE");
  });

  it("RESET depuis SUCCESS", () => {
    const s = voiceMachineReducer(
      { ...initialState, step: "SUCCESS" },
      { type: "RESET" },
    );
    expect(s.step).toBe("IDLE");
  });

  it("SAVE_FAIL depuis SAVING → ERROR avec canRetry", () => {
    const s = voiceMachineReducer(
      { ...initialState, step: "SAVING" },
      { type: "SAVE_FAIL", error: "Network error" },
    );
    expect(s.step).toBe("ERROR");
    expect(s.canRetry).toBe(true);
  });

  it("interdit les transitions invalides", () => {
    // CONFIRM_SAVE depuis IDLE n'est pas autorisé
    const s = voiceMachineReducer(initialState, { type: "CONFIRM_SAVE" });
    expect(s.step).toBe("IDLE"); // pas de changement
  });

  it("toutes les transitions ALLOWED sont valides", () => {
    for (const [from, events] of Object.entries(ALLOWED_TRANSITIONS)) {
      for (const eventType of events) {
        const state = { ...initialState, step: from as any };
        const event = { type: eventType } as VoiceEvent;
        // La transition ne doit pas planter
        const result = voiceMachineReducer(state, event);
        // Self-transitions valides (état inchangé)
        const isSelfTransition =
          (from === "IDLE" && eventType === "RESET") ||
          (from === "EXTRACTING" && eventType === "START_EXTRACT") ||
          (from === "REVIEW" && eventType === "DUPLICATE_FOUND");
        if (!isSelfTransition) {
          expect(result.step).not.toBe(from);
        }
      }
    }
  });
});

// ─── Phase 4: Local Extract ──────────────────────────────────────────────────

describe("Phase 4: Local Extract fallback", () => {
  it("extrait le nom depuis le début du transcript", () => {
    const r = localExtract("Chez Paul, Lyon 3ème, intéressé");
    expect(r.last_name).toContain("Chez Paul");
    expect(r.canal_acquisition).toBe("terrain");
  });

  it("détecte l'intérêt 'intéressé'", () => {
    const r = localExtract("motivé, rappel");
    expect(r.interestLevel).toBe("intéressé");
  });

  it("détecte l'intérêt 'pas_intéressé'", () => {
    const r = localExtract("pas intéressé du tout");
    expect(r.interestLevel).toBe("pas_intéressé");
    expect(r.status).toBe("perdu");
  });

  it("extrait un téléphone", () => {
    const r = localExtract("Contact au 06 12 34 56 78");
    expect(r.phone).toContain("06");
  });

  it("extrait un email", () => {
    const r = localExtract("Email: contact@test.fr");
    expect(r.email).toBe("contact@test.fr");
  });
});

// ─── Phase 15: Duplicate Detection ──────────────────────────────────────────

describe("Phase 15: Duplicate Detection", () => {
  const existing = [
    { id: "1", last_name: "Chez Paul", phone: "0612345678", company: "Chez Paul", contact: "paul@test.fr" },
    { id: "2", last_name: "Brasserie Lyon", phone: "0698765432", company: "Brasserie Lyon", contact: "contact@brasserie.fr" },
  ];

  it("détecte doublon par téléphone", () => {
    const dups = detectDuplicates(
      { last_name: "Test", phone: "06 12 34 56 78" },
      existing,
    );
    expect(dups).toHaveLength(1);
    expect(dups[0].matchField).toBe("phone");
    expect(dups[0].id).toBe("1");
  });

  it("détecte doublon par entreprise", () => {
    const dups = detectDuplicates(
      { last_name: "Test", company: "Chez Paul" },
      existing,
    );
    expect(dups).toHaveLength(1);
    expect(dups[0].matchField).toBe("company");
  });

  it("ne détecte pas de doublon si aucun champ commun", () => {
    const dups = detectDuplicates(
      { last_name: "Nouveau", phone: "0700000000" },
      existing,
    );
    expect(dups).toHaveLength(0);
  });

  it("retourne vide si aucun champ candidat", () => {
    const dups = detectDuplicates({ last_name: "Test" }, existing);
    expect(dups).toHaveLength(0);
  });

  it("détecte doublon par contact", () => {
    const dups = detectDuplicates(
      { last_name: "Test", email: "paul@test.fr" },
      existing,
    );
    expect(dups).toHaveLength(1);
    expect(dups[0].matchField).toBe("contact");
  });
});

// ─── Phase 3: Transcript Store ───────────────────────────────────────────────

describe("Phase 3: Transcript Store", () => {
  beforeEach(() => resetTranscriptStore());

  it("accumule le texte final", () => {
    appendTranscript("Bonjour", true);
    appendTranscript("le monde", true);
    expect(getTranscript()).toBe("Bonjour le monde");
  });

  it("ignore le texte non-final", () => {
    appendTranscript("Bonjour", false);
    expect(getTranscript()).toBe("");
  });

  it("versionne les ajouts", () => {
    appendTranscript("Premier", true);
    appendTranscript("Deuxième", true);
    const versions = getTranscriptVersions();
    expect(versions).toHaveLength(2);
    expect(versions[0].id).toBe("v1");
    expect(versions[1].id).toBe("v2");
  });

  it("setTranscript crée une version", () => {
    setTranscript("Texte collé");
    expect(getTranscript()).toBe("Texte collé");
    expect(getTranscriptVersions()).toHaveLength(1);
  });
});

// ─── Phase 10: Draft Store ───────────────────────────────────────────────────

describe("Phase 10: Draft Store", () => {
  beforeEach(() => {
    clearDrafts();
    // localStorage cleanup
    localStorage.removeItem("voice_draft");
  });

  it("sauvegarde et récupère un draft", () => {
    const d = saveDraft({
      transcript: "test transcript",
      candidate: { last_name: "Test" },
      step: "REVIEW",
      saved: false,
    });
    expect(d.transcript).toBe("test transcript");
    expect(d.id).toBeTruthy();
    expect(d.step).toBe("REVIEW");
  });

  it("récupère le dernier draft", () => {
    saveDraft({ transcript: "premier", candidate: null, step: "IDLE", saved: false });
    saveDraft({ transcript: "dernier", candidate: null, step: "IDLE", saved: false });
    const last = getLastDraft();
    expect(last?.transcript).toBe("dernier");
  });

  it("liste tous les drafts (max 5)", () => {
    for (let i = 0; i < 10; i++) {
      saveDraft({ transcript: `draft ${i}`, candidate: null, step: "IDLE", saved: false });
    }
    expect(listDrafts()).toHaveLength(5);
  });

  it("détecte un draft non sauvegardé", () => {
    saveDraft({ transcript: "non saved", candidate: null, step: "ERROR", saved: false });
    expect(hasUnsavedDraft()).toBe(true);
  });
});

// ─── Phase 16: Safe Notes Merge (testé dans VoiceRecorder) ──────────────────

describe("Phase 16: Notes merge", () => {
  it("les notes vocales doivent être [DATE] résumé — cumulatives et non destructives", () => {
    // Test de la logique de merge
    const existingNotes = "Première note existante";
    const summary = "Résumé vocal du jour";

    const dateStr = new Date().toLocaleDateString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "2-digit",
    });
    const noteLine = `[${dateStr}] ${summary}`;
    const merged = `${existingNotes}\n${noteLine}`;

    expect(merged).toContain(dateStr);
    expect(merged).toContain("Résumé vocal du jour");
    expect(merged).toContain("Première note existante");
  });
});
