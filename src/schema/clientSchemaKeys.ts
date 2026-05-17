import { ClientSchema } from "./clientSchema";

export const ClientSchemaKeys = Object.keys(ClientSchema.shape) as Array<
  keyof (typeof ClientSchema)["shape"]
>;

if (ClientSchemaKeys.length === 0) {
  throw new Error(
    "[SCHEMA_FATAL] ClientSchemaKeys is empty — ClientSchema.shape is empty or corrupted. "
    + "Check src/schema/clientSchema.ts exports a non-empty Zod object."
  );
}
