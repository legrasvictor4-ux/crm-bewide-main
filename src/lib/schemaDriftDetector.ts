import { ClientSchema } from "@/schema/clientSchema";
import { ClientSchemaKeys } from "@/schema/clientSchemaKeys";
import type { Database } from "@/integrations/supabase/types";
import logger from "@/lib/logger";

type SupabaseClientRow = Database["public"]["Tables"]["clients"]["Row"];

// Note: At runtime, TypeScript types are erased, so we define the known columns explicitly
// to compare against Zod schema keys.

function getExpectedZodKeys(): Set<string> {
  return new Set(ClientSchemaKeys as string[]);
}

function getDeclaredSelectColumns(): string[] {
  return [
    "id", "name", "email", "phone", "address", "status",
    "role", "latitude", "longitude", "statut_opportunite", "priorite",
    "motif_objection", "date_relance", "offre_cible", "canal_acquisition",
  ];
}

export interface DriftReport {
  hasDrift: boolean;
  zodKeysWithoutType: string[];
  typeKeysWithoutZod: string[];
  selectColumnsWithoutZod: string[];
  zodKeysWithoutSelect: string[];
  warnings: string[];
}

export function detectSchemaDrift(): DriftReport {
  const zodKeys = getExpectedZodKeys();
  const selectCols = new Set(getDeclaredSelectColumns());

  const selectColumnsWithoutZod: string[] = [];
  const zodKeysWithoutSelect: string[] = [];
  const warnings: string[] = [];

  for (const key of zodKeys) {
    if (!selectCols.has(key)) {
      zodKeysWithoutSelect.push(key);
      warnings.push(`CLIENT_SCHEMA_DRIFT: La clé Zod "${key}" n'est pas dans EXPLICIT_COLUMNS`);
    }
  }

  for (const col of getDeclaredSelectColumns()) {
    if (!zodKeys.has(col)) {
      selectColumnsWithoutZod.push(col);
      warnings.push(`CLIENT_SCHEMA_DRIFT: La colonne SELECT "${col}" n'est pas dans ClientSchema`);
    }
  }

  if (warnings.length > 0) {
    for (const w of warnings) {
      logger.supabase.warn("schemaDriftDetector", w);
    }
  }

  return {
    hasDrift: warnings.length > 0,
    zodKeysWithoutType: [],
    typeKeysWithoutZod: [],
    selectColumnsWithoutZod,
    zodKeysWithoutSelect,
    warnings,
  };
}

export function assertNoSchemaDrift(): void {
  if (typeof process === "undefined") return;
  if (process.env.NODE_ENV !== "development") return;

  const report = detectSchemaDrift();
  if (report.hasDrift) {
    console.group("[SCHEMA_DRIFT_DETECTED]");
    console.warn("Des colonnes SELECT sont absentes du schéma Zod :", report.selectColumnsWithoutZod);
    console.warn("Des colonnes Zod sont absentes de SELECT :", report.zodKeysWithoutSelect);
    console.groupEnd();
  }
}
