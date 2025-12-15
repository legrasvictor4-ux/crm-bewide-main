import { z } from "zod";
import { contactRecordSchema } from "../../types/contact.js";

export const contactSchema = contactRecordSchema;

export function validateContact(payload) {
  const parsed = contactSchema.safeParse(payload);
  if (!parsed.success) {
    const validationErrors = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    const error = new Error("Validation error");
    error.validationErrors = validationErrors;
    throw error;
  }
  return parsed.data;
}
