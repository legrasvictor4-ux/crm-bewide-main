import { ApiError } from "@/types/api";
import logger from "@/lib/logger";

const PGRST_ERROR_MAP: Record<string, { message: string; statusCode: number; severity: string }> = {
  PGRST204: { message: "Colonne inconnue dans la base de données", statusCode: 400, severity: "HIGH" },
  PGRST116: { message: "Aucun enregistrement trouvé", statusCode: 404, severity: "LOW" },
  PGRST200: { message: "Requête invalide", statusCode: 400, severity: "MEDIUM" },
  PGRST201: { message: "Contenu introuvable", statusCode: 404, severity: "MEDIUM" },
  PGRST202: { message: "Argument manquant", statusCode: 400, severity: "HIGH" },
  PGRST203: { message: "Fonction introuvable", statusCode: 404, severity: "HIGH" },
};

const SUPABASE_AUTH_ERROR_MAP: Record<string, { message: string; statusCode: number }> = {
  "auth/invalid-email": { message: "Email invalide", statusCode: 400 },
  "auth/user-not-found": { message: "Utilisateur introuvable", statusCode: 404 },
  "auth/wrong-password": { message: "Mot de passe incorrect", statusCode: 401 },
  "auth/email-already-in-use": { message: "Email déjà utilisé", statusCode: 409 },
  "auth/weak-password": { message: "Mot de passe trop faible", statusCode: 400 },
  "auth/expired-token": { message: "Token expiré, reconnectez-vous", statusCode: 401 },
  "auth/invalid-verification-token": { message: "Token de vérification invalide", statusCode: 400 },
};

export function normalizeSupabaseError(err: unknown, context?: string): ApiError {
  const error = err as Record<string, unknown> | null;
  const code = (typeof error?.code === "string" ? error.code : typeof error?.name === "string" ? error.name : "UNKNOWN").toUpperCase();
  const message = typeof error?.message === "string" ? error.message : "Erreur base de données inconnue";
  const details = typeof error?.details === "string" ? error.details : typeof error?.hint === "string" ? error.hint : undefined;

  // PGRST errors
  if (code.startsWith("PGRST")) {
    const mapped = PGRST_ERROR_MAP[code];
    if (mapped) {
      logger.supabase.warn("normalizeSupabaseError", `${mapped.severity}: ${code} — ${mapped.message}`, {
        code, details, context,
      });
      return new ApiError(
        details
          ? `${mapped.message} : ${details}`
          : mapped.message,
        mapped.statusCode,
        code,
        { original: message, details, context },
      );
    }

    // Generic PGRST fallback
    logger.supabase.warn("normalizeSupabaseError", `PGRST:${code}`, { message, details, context });
    return new ApiError(
      `Erreur base de données [${code}]${details ? ` (${details})` : ""}`,
      400,
      code,
      { original: message, details, context },
    );
  }

  // Supabase Auth errors
  const authKey = Object.keys(SUPABASE_AUTH_ERROR_MAP).find(k => message?.toLowerCase().includes(k.toLowerCase()));
  if (authKey) {
    const mapped = SUPABASE_AUTH_ERROR_MAP[authKey];
    logger.supabase.warn("normalizeSupabaseError", `AUTH:${authKey}`, { context });
    return new ApiError(mapped.message, mapped.statusCode, authKey, { original: message, context });
  }

  // Network / fetch errors
  if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ETIMEDOUT") {
    logger.supabase.error("normalizeSupabaseError", `NETWORK:${code}`, { context });
    return new ApiError("Impossible de contacter le serveur", 503, code, { original: message, context });
  }

  // Generic fallback
  logger.supabase.warn("normalizeSupabaseError", `UNKNOWN:${code}`, { message, context });
  return new ApiError(message, 500, code, { original: message, details, context });
}

export function isPgrstColumnError(err: unknown): boolean {
  const code = (err as any)?.code ?? "";
  return code === "PGRST204";
}

export function isPgrstNotFound(err: unknown): boolean {
  const code = (err as any)?.code ?? "";
  return code === "PGRST116";
}
