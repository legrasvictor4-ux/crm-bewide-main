/**
 * supabaseObservability.ts — Wrapper d'observabilité autour du client Supabase
 *
 * Intercepte toutes les requêtes Supabase pour journaliser :
 *  - table cible
 *  - type d'opération (SELECT / INSERT / UPDATE / DELETE)
 *  - durée d'exécution
 *  - code d'erreur PostgREST (PGRST204, etc.)
 *
 * Ne modifier PAS le comportement métier — wrapping pass-through.
 */

import type { SupabaseClient, PostgrestSingleResponse, PostgrestResponse } from "@supabase/supabase-js";
import type { Database } from "./types";
import logger from "@/lib/logger";

type InstrumentedClient = SupabaseClient<Database>;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function detectOperation(sqlHint: string): string {
  const s = sqlHint.trim().toUpperCase();
  if (s.startsWith("INSERT")) return "INSERT";
  if (s.startsWith("UPDATE")) return "UPDATE";
  if (s.startsWith("DELETE")) return "DELETE";
  return "SELECT";
}

function extractTable(sqlHint: string): string {
  // Très basique: FROM <table> / INTO <table> / UPDATE <table>
  const m = sqlHint.match(/(?:FROM|INTO|UPDATE|DELETE\s+FROM)\s+["']?(\w+)["']?/i);
  return (m?.[1] ?? "unknown").toLowerCase();
}

// ─── Instrumented .from() ─────────────────────────────────────────────────────
/**
 * Wrap un client Supabase pour instrumenter tous les appels.
 * Utilisé dans `src/services/clientsAdapter.ts` au lieu de `supabase` brut.
 */
export function instrumentSupabase(raw: InstrumentedClient): InstrumentedClient {
  const origFrom = raw.from.bind(raw);

  // biome-ignore lint: dynamic augmentation for query builder instrumentation
  (raw as unknown as Record<string, unknown>).from = function (this: InstrumentedClient, table: string) {
    const queryBuilder = origFrom(table);

    // Wrapper pour chaque méthode de terminaison qui exécute la requête
    // IMPORTANT: method doit être bind() au queryBuilder pour préserver
    // le `this` context dont les méthodes Supabase PostgREST ont besoin
    // (notamment cloneRequestState, url, headers).
    const wrapTerminal = <T extends (...args: any[]) => any>(
      method: T,
      opLabel: string,
    ): T => {
      const bound = method.bind(queryBuilder);
      return ((...args: any[]) => {
        const t0 = performance.now();

        logger.supabase.debug("instrument", `→ ${opLabel.toUpperCase()} on.${table}`, {});

        try {
          const result = bound(...args);
          const t1 = performance.now();
          const durationMs = Math.round(t1 - t0);

          if (result && typeof result === "object" && "error" in result && (result as any).error) {
            const err = (result as any).error;
            const code = (err?.code ?? err?.name ?? "UNKNOWN").toUpperCase();
            logger.supabase.warn("instrument", `← ${opLabel.toUpperCase()} ${table} ${code} (${durationMs}ms)`, {
              code,
              message: err?.message,
            });
          } else {
            logger.supabase.info("instrument", `← ${opLabel.toUpperCase()} ${table} OK (${durationMs}ms)`);
          }
          return result;
        } catch (err: unknown) {
          const t1 = performance.now();
          const errObj = err as Error;
          logger.supabase.error("instrument", `${opLabel.toUpperCase()} ${table} threw`, {
            error: errObj?.message,
            code: (errObj as any)?.code ?? errObj?.name ?? "",
            durationMs: Math.round(t1 - t0),
          });
          throw err;
        }
      }) as unknown as T;
    };

    // Apply wrappers only to terminal methods
    // Chaque méthode est bind() au queryBuilder via wrapTerminal
    (queryBuilder as any).select   = wrapTerminal((queryBuilder as any).select,    "select");
    (queryBuilder as any).insert   = wrapTerminal((queryBuilder as any).insert,    "insert");
    (queryBuilder as any).update   = wrapTerminal((queryBuilder as any).update,    "update");
    (queryBuilder as any).delete   = wrapTerminal((queryBuilder as any).delete,    "delete");
    (queryBuilder as any).upsert   = wrapTerminal((queryBuilder as any).upsert,    "upsert");
    (queryBuilder as any).rpc     = wrapTerminal((queryBuilder as any).rpc,      "rpc");

    return queryBuilder;
  };

  return raw;
}
