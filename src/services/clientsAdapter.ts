import { supabase, isSupabaseReady } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { ApiError } from "@/types/api";
import { sanitizeClientForDb } from "@/schema/sanitizeClient";
import { ClientSchema } from "@/schema/clientSchema";
import { safeSelect, safeInsert, safeUpdate } from "@/lib/safeSupabase";
import { normalizeSupabaseError } from "@/lib/normalizeSupabaseError";
import { devGuardValidateColumns } from "@/lib/devGuard";
import { assertNoSchemaDrift } from "@/lib/schemaDriftDetector";

function assertSupabaseReady(context: string): void {
  if (!isSupabaseReady || !supabase.auth) {
    throw new ApiError(
      `Supabase client not initialized — query blocked: ${context}`,
      503,
      "SUPABASE_NOT_READY",
    );
  }
}

const NON_RETRYABLE_CODES = new Set([
  "TYPEERROR",
  "SUPABASE_NOT_READY",
  "CLIENT_DELETE_INVALID_ID",
  "CLIENT_NOT_FOUND",
]);
const NON_RETRYABLE_MESSAGES = new Set([
  "cloneRequestState",
  "not initialized",
  "Supabase client not initialized",
]);

function isRetryable(error: unknown): boolean {
  const err = error instanceof ApiError ? error : error instanceof Error ? error : null;
  if (!err) return false;
  if (NON_RETRYABLE_CODES.has(err.code ?? "")) return false;
  const msg = err.message?.toLowerCase() ?? "";
  for (const pattern of NON_RETRYABLE_MESSAGES) {
    if (msg.includes(pattern.toLowerCase())) return false;
  }
  return true;
}

// Vérification de cohérence du schéma au démarrage (dev uniquement)
if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
  try { assertNoSchemaDrift(); } catch { /* skip si appelé hors module */ }
}

// ─── Status normalizer ─────────────────────────────────────────────────────────
function normalizeStatus(status?: string): string {
  if (!status) return "prospect"
  const v = status.toLowerCase().trim()
  if (v === "client actif") return "client_actif"
  if (v === "client_actif") return "client_actif"
  if (v === "active") return "active"
  if (v === "activé") return "active"
  if (v === "prospect") return "prospect"
  if (v === "perdu") return "perdu"
  if (v === "a recontacter") return "a_recontacter"
  if (v === "a_recontacter") return "a_recontacter"
  return "prospect"
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Client = Database["public"]["Tables"]["clients"]["Row"];
type CreateClientInput = Database["public"]["Tables"]["clients"]["Insert"];
type UpdateClientInput = Database["public"]["Tables"]["clients"]["Update"];

export type FetchClientsParams = {
  filter?: Client["status"] | Client["statut_opportunite"] | "all";
  filterField?: "status" | "statut_opportunite";
  search?: string;
  signal?: AbortSignal;
};

// ─── Explicit column list (UNIQUE source of truth for DB SELECT) ───────────────
const EXPLICIT_COLUMNS = `
  id,
  name,
  email,
  phone,
  address,
  status,
  role,
  latitude,
  longitude,
  statut_opportunite,
  priorite,
  motif_objection,
  date_relance,
  offre_cible,
  canal_acquisition
` as const;

// ─── Utils ────────────────────────────────────────────────────────────────────
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 250): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (!isRetryable(error)) throw error;
    if (retries <= 0) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        "Impossible de contacter la base. Réessayer.",
        500,
        "DB_RETRY_FAILED",
        error instanceof Error ? error.message : String(error)
      );
    }
    await wait(delay);
    return withRetry(fn, retries - 1, delay * 2);
  }
}

// ─── fetchClients ─────────────────────────────────────────────────────────────
export async function fetchClients(params: FetchClientsParams = {}): Promise<Client[]> {
  assertSupabaseReady("fetchClients");
  const { filter = "all", search = "", signal } = params;

  return withRetry(async () => {
    let query = supabase.from("clients").select(EXPLICIT_COLUMNS);
    if (signal) query = query.abortSignal(signal);

    if (filter !== "all" && filter != null) {
      const field = params.filterField ?? "status";
      query = query.eq(field, filter);
    }

    const result = await safeSelect<Client>(query, { context: "fetchClients" });
    if (!result.success) throw result.error;

    const term = search.toLowerCase();
    return (result.data || []).filter((client) => {
      const termOk =
        !term ||
        (client.name || client.email || client.phone || client.address || "").toLowerCase().includes(term);
      return termOk;
    });
  });
}

// ─── createClient ─────────────────────────────────────────────────────────────
/**
 * Seul point d'entrÃ©e autorisÃ© pour crÃ©er un client en DB.
 * Pipeline : raw input â†’ extraction explicite par clÃ©s ClientSchema â†’
 *            sanitizeForDb (whitelist zod strict) â†’ insert
 */
export async function createClient(input: unknown): Promise<Client> {
  assertSupabaseReady("createClient");
  return withRetry(async () => {
    const raw = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};

    const explicitInput: Record<string, unknown> = {};
    for (const key of Object.keys(ClientSchema.shape)) {
      if (Object.prototype.hasOwnProperty.call(raw, key)) {
        explicitInput[key] = raw[key];
      }
    }

    const sanitized = sanitizeClientForDb(explicitInput);
    if (!sanitized.success) {
      console.warn(
        "[CLIENT_SANITIZE_REJECT]",
        "createClient input rejetÃ©",
        sanitized.issues.map((is) => is.path.join(".") || is.code).join(", ")
      );
      throw new ApiError(
        "DonnÃ©es client invalides",
        400,
        "CLIENT_CREATE_INVALID",
        sanitized.issues
      );
    }

    // Phase 3: insert (payload 100% validÃ© par ClientSchema)
    const insertPayload = sanitized.data as Record<string, unknown>;
    if (typeof insertPayload.status === "string") {
      insertPayload.status = normalizeStatus(insertPayload.status);
    }

    const result = await safeInsert<Client>(
      supabase.from("clients").insert(insertPayload as any).select(EXPLICIT_COLUMNS).single(),
      { context: "createClient" }
    );
    if (!result.success) throw result.error;

    return result.data;
  });
}

// ─── updateClient ─────────────────────────────────────────────────────────────
export async function updateClient(id: string, input: unknown): Promise<Client> {
  assertSupabaseReady("updateClient");
  return withRetry(async () => {
    const sanitized = sanitizeClientForDb(input);
    if (!sanitized.success) {
      console.warn(
        "[CLIENT_SANITIZE_REJECT]",
        `updateClient id=${id} rejetÃ©`,
        sanitized.issues.map((is) => is.path.join(".") || is.code).join(", ")
      );
      throw new ApiError(
        "DonnÃ©es client invalides",
        400,
        "CLIENT_UPDATE_INVALID",
        sanitized.issues
      );
    }

    const updatePayload = sanitized.data as Record<string, unknown>;
    if (typeof updatePayload.status === "string") {
      updatePayload.status = normalizeStatus(updatePayload.status);
    }

    const result = await safeUpdate<Client>(
      supabase.from("clients").update(updatePayload as any).eq("id", id).select(EXPLICIT_COLUMNS).single(),
      { context: "updateClient" }
    );
    if (!result.success) throw result.error;

    return result.data;
  });
}

// ─── deleteClient ─────────────────────────────────────────────────────────────
export async function deleteClient(id: string): Promise<void> {
  assertSupabaseReady("deleteClient");
  if (!id || typeof id !== "string") {
    throw new ApiError("ID client invalide", 400, "CLIENT_DELETE_INVALID_ID");
  }
  return withRetry(async () => {
    const { data, error } = await supabase.from("clients").delete().eq("id", id).select();
    if (error) throw normalizeSupabaseError(error, `deleteClient(${id})`);
    if (!data || data.length === 0) {
      throw new ApiError(
        `Client ${id} introuvable ou déjà supprimé`,
        404,
        "CLIENT_NOT_FOUND"
      );
    }
  });
}
