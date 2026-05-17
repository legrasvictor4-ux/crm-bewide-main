import { z } from "zod";
import { ClientSchema } from "./clientSchema";
import { ClientSchemaKeys } from "./clientSchemaKeys";
import { devGuardRejectKeys } from "@/lib/devGuard";

function whitelist(input: Record<string, unknown>, context?: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const rejectedKeys: string[] = [];
  
  for (const key of Object.keys(input)) {
    if (ClientSchemaKeys.includes(key as any)) {
      out[key] = input[key];
    } else {
      rejectedKeys.push(key);
    }
  }

  if (rejectedKeys.length > 0) {
    console.warn("[CLIENT_SANITIZE_REJECT]", `Context: ${context || "unknown"}`, rejectedKeys);
    devGuardRejectKeys(input, context);
  }

  return out;
}

/**
 * Sanitise + valide selon ClientSchema (source of truth unique).
 * - Supprime automatiquement tout champ inconnu (zéro "champ fantôme").
 * - Applique ClientSchema.strict() (zod strict) ensuite.
 */
export function sanitizeAndValidateClient(input: unknown) {
  const candidate =
    typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};

  const whitelisted = whitelist(candidate);

  return ClientSchema.strict().safeParse(whitelisted);
}

/**
 * Valide un payload incomplet sans transformation (pour les previews / tests).
 * Retourne true si tous les champs présents sont valides, false sinon.
 * N'applique pas la whitelist — utile quand les clés sont déjà connues sûres.
 */
export function isClientSchemaCompatible(input: unknown): boolean {
  if (typeof input !== "object" || input === null) return false;
  const parsed = ClientSchema.safeParse(input);
  return parsed.success;
}

export type SanitizedClientResult =
  | { success: true; data: z.infer<typeof ClientSchema> }
  | { success: false; issues: z.ZodIssue[] };

export function sanitizeClientForDb(input: unknown): SanitizedClientResult {
  const res = sanitizeAndValidateClient(input);
  if (!res.success) return { success: false, issues: res.error.issues };
  return { success: true, data: res.data };
}
