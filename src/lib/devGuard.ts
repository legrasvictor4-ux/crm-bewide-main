import { ClientSchemaKeys } from "@/schema/clientSchemaKeys";

const DEV = typeof process !== "undefined" && process.env?.NODE_ENV === "development";

let originStack: string | undefined;

export function setDevGuardOrigin(stack?: string): void {
  originStack = stack;
}

export function devGuardRejectKeys(input: Record<string, unknown>, context?: string): void {
  if (!DEV) return;

  const schemaKeys = new Set(ClientSchemaKeys as string[]);
  const unknownKeys: string[] = [];
  for (const key of Object.keys(input)) {
    if (!schemaKeys.has(key)) {
      unknownKeys.push(key);
    }
  }

  if (unknownKeys.length > 0) {
    const stack = originStack || new Error().stack?.split("\n").slice(2, 5).join("\n") || "";
    const error = new Error(
      `[DEV_GUARD] Colonnes inconnues détectées: ${unknownKeys.join(", ")}${context ? ` (${context})` : ""}\nStack: ${stack}`
    );
    error.name = "DevGuardError";
    console.error(error);
    throw error;
  }
}

export function devGuardValidateColumns(columns: string[], source: string): void {
  if (!DEV) return;

  const schemaKeys = new Set(ClientSchemaKeys as string[]);
  const invalidCols = columns.filter(c => !schemaKeys.has(c));
  if (invalidCols.length > 0) {
    throw new Error(
      `[DEV_GUARD] Colonnes inconnues dans .select() depuis ${source}: ${invalidCols.join(", ")}`
    );
  }
}
