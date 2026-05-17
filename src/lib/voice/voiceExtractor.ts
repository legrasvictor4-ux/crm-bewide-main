import { supabase } from "@/integrations/supabase/client";
import { sanitizeClientForDb } from "@/schema/sanitizeClient";
import type { Client } from "@/schema/clientSchema";
import { devGuardRejectKeys } from "@/lib/devGuard";
import logger from "@/lib/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExtractionResult = {
  success: true;
  candidate: Record<string, unknown>;
  raw: Record<string, unknown>;
} | {
  success: false;
  error: string;
  stage: "ai_call" | "parse" | "sanitize" | "validate";
};

export interface ExtractionOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  onTrace?: (event: string, data?: any) => void;
}

// ─── Analyse locale de fallback (heuristique) ────────────────────────────────

export function localExtract(transcript: string): Record<string, unknown> {
  const t = transcript.toLowerCase();

  let interestLevel = "neutre";
  if (/intéress|motiv|rappel|recontact/i.test(transcript)) interestLevel = "intéressé";
  if (/signé|deal|accord|validé/i.test(transcript))        interestLevel = "très_intéressé";
  if (/pas intéress|refus|négatif|froid/i.test(transcript)) interestLevel = "pas_intéressé";
  if (/rdv|rendez.vous|visite/i.test(transcript))           interestLevel = "intéressé";

  const arrMatch = transcript.match(/(\d{1,2})(?:e(?:r)?|è?me)/i);
  const phoneMatch = transcript.match(/(\+?\d[\d\s.\-()]{6,})/);
  const emailMatch = transcript.match(/[\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,}/i);
  const name = transcript.split(/[,.\n]/)[0].trim().slice(0, 60) || "Prospection vocale";

  return {
    last_name: name,
    restaurantName: name,
    phone: phoneMatch?.[0].trim() ?? null,
    email: emailMatch?.[0] ?? null,
    interestLevel,
    status: interestLevel === "pas_intéressé" ? "perdu" : "prospect",
    canal_acquisition: "terrain",
    arrondissement: arrMatch ? `${arrMatch[1]}e` : null,
    location: {
      full: arrMatch ? `${arrMatch[1]}e` : null,
      district: arrMatch ? `${arrMatch[1]}e` : null,
      street: null,
      landmark: null,
    },
    notes: transcript.slice(0, 300),
  };
}

// ─── Pipeline extraction isolée ──────────────────────────────────────────────

async function callAiAnalyze(
  transcription: string,
  options?: ExtractionOptions,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke("analyze-voice-data", {
    body: { transcription },
  });
  if (error) throw new Error(`AI extraction failed: ${error.message}`);
  if (!data?.extractedData) throw new Error("AI returned no extractedData");
  return data.extractedData as Record<string, unknown>;
}

export async function extractAndSanitize(
  transcript: string,
  options?: ExtractionOptions,
): Promise<ExtractionResult> {
  const trace = options?.onTrace ?? (() => {});
  const signal = options?.signal;

  trace("EXTRACTION_STARTED", { transcriptLength: transcript.length });

  const timeoutMs = options?.timeoutMs ?? 15_000;
  let raw: Record<string, unknown>;

  // Étape 1: Appel IA avec timeout
  try {
    trace("AI_CALL_STARTED");
    const result = await withTimeout(
      callAiAnalyze(transcript, options),
      timeoutMs,
      "Délai d'extraction IA dépassé",
      signal,
    );
    raw = result;
    trace("AI_CALL_DONE", { keys: Object.keys(raw) });
  } catch (err: any) {
    if (err?.name === "AbortError" || signal?.aborted) {
      return { success: false, error: "Extraction annulée", stage: "ai_call" };
    }
    logger.voice.warn("extractAndSanitize", "AI call failed, fallback local", { error: err.message });
    trace("AI_CALL_FALLBACK_LOCAL");
    // Fallback local
    raw = localExtract(transcript);
  }

  // Étape 2: Construire le payload candidat
  trace("BUILD_CANDIDATE");
  const candidate = buildCandidate(raw, transcript);

  // Étape 3: Sanitize via whitelist Zod
  trace("SANITIZE_CALLED");
  const sanitized = sanitizeClientForDb(candidate);
  if (!sanitized.success) {
    const errMsg = sanitized.error?.issues?.map(i => i.message).join("; ") ?? "Sanitation échouée";
    logger.voice.warn("extractAndSanitize", "SANITIZE_FAILED", { error: errMsg });
    trace("SANITIZE_FAILED", { error: errMsg });
    return { success: false, error: errMsg, stage: "sanitize" };
  }

  // Phase 4: DevGuard — rejeter les clés inconnues en dev
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    devGuardRejectKeys(candidate, "voice_extractor");
  }

  trace("SANITIZE_OK");
  return {
    success: true,
    candidate: sanitized.data as unknown as Record<string, unknown>,
    raw,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapInterestToStatus(level?: string): string {
  if (level === "pas_intéressé") return "perdu";
  return "prospect";
}

function mapInterestToOpportunite(level?: string): string | null {
  if (level === "très_intéressé") return "chaud";
  if (level === "intéressé")       return "tiède";
  if (level === "à_recontacter")   return "tiède";
  if (level === "pas_intéressé")   return "froid";
  return null;
}

function buildCandidate(raw: Record<string, unknown>, transcript: string): Record<string, unknown> {
  const loc = raw.location as any;

  const today = new Date();
  const dateStr = `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1).toString().padStart(2, "0")}/${today.getFullYear().toString().slice(2)}`;
  const notes = `${dateStr} : ${(raw as any).summary || transcript.slice(0, 200)}`;

  return {
    first_name: null,
    last_name: ((raw as any).restaurantName || "Prospection vocale").trim(),
    contact: (raw as any).contactPerson?.name ?? null,
    role: (raw as any).contactPerson?.role ?? null,
    status: mapInterestToStatus((raw as any).interestLevel),
    statut_opportunite: mapInterestToOpportunite((raw as any).interestLevel),
    canal_acquisition: "terrain",
    priorite: (raw as any).interestLevel === "très_intéressé" ? "haute" : null,
    address: loc?.street ?? null,
    next_action: buildNextAction(raw),
    business_description: [(raw as any).businessType, (raw as any).summary].filter(Boolean).join(" — ") || null,
    segmentation: (raw as any).businessType ?? null,
    notes,
    metadata: { source: "voice_extractor", extraction_raw: raw },
  };
}

function buildNextAction(raw: Record<string, unknown>): string | null {
  const na = (raw as any).nextAction;
  if (!na?.type) return null;
  return [na.type, na.date, na.time].filter(Boolean).join(" — ");
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
  signal?: AbortSignal,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  try {
    const result = await Promise.race([promise, timeout]);
    return result;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ─── Duplicate detection ─────────────────────────────────────────────────────

export interface DuplicateMatch {
  id: string;
  last_name: string;
  phone?: string | null;
  company?: string | null;
  contact?: string | null;
  matchField: "phone" | "company" | "contact" | "email";
}

export function detectDuplicates(
  candidate: Record<string, unknown>,
  existingClients: DuplicateMatch[],
): DuplicateMatch[] {
  const phone = String(candidate.phone ?? "").replace(/\s/g, "");
  const email = String(candidate.email ?? "").toLowerCase().trim();
  const company = String(candidate.company ?? "").toLowerCase().trim();
  const contact = String(candidate.contact ?? "").toLowerCase().trim();

  if (!phone && !email && !company && !contact) return [];

  const matches: DuplicateMatch[] = [];

  for (const client of existingClients) {
    if (phone && client.phone) {
      const cleanClientPhone = String(client.phone).replace(/\s/g, "");
      if (cleanClientPhone.includes(phone) || phone.includes(cleanClientPhone)) {
        matches.push({ ...client, matchField: "phone" });
        continue;
      }
    }
    if (email && client.contact) {
      const clientEmail = String(client.contact).toLowerCase().trim();
      if (clientEmail === email) {
        matches.push({ ...client, matchField: "contact" });
        continue;
      }
    }
    if (company && client.company) {
      const clientCompany = String(client.company).toLowerCase().trim();
      if (clientCompany === company || clientCompany.includes(company) || company.includes(clientCompany)) {
        matches.push({ ...client, matchField: "company" });
        continue;
      }
    }
  }

  return matches;
}
