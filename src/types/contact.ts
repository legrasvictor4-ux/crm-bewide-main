import { z } from "zod";

export const contactPersonSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  role: z.string().min(1, "Le rôle est requis"),
  phone: z.string().min(3, "Téléphone requis"),
  email: z.string().email("Email invalide"),
});

export const optionalContactPersonSchema = contactPersonSchema.partial().refine(
  (val) => {
    const values = Object.values(val).map((v) => (typeof v === "string" ? v.trim() : v));
    const allEmpty = values.every((v) => v === undefined || v === "");
    const allFilled = values.every((v) => v !== undefined && v !== "");
    return allEmpty || allFilled;
  },
  { message: "Renseigner tous les champs du contact secondaire ou laisser vide" }
);

export const socialInfoSchema = z.object({
  instagramHandle: z.string().optional(),
  instagramFollowers: z.number().int().nonnegative().optional(),
  tikTokHandle: z.string().optional(),
  tikTokFollowers: z.number().int().nonnegative().optional(),
  linkedInProfile: z.string().url().optional(),
  linkedInConnections: z.number().int().nonnegative().optional(),
});

export const appointmentSchema = z
  .object({
    date: z.string().trim().optional(),
    summary: z.string().trim().optional(),
    nextDate: z.string().trim().optional(),
    nextObjective: z.string().trim().optional(),
    whatsappFollowUp: z.boolean().optional(),
  })
  .refine(
    (val) => {
      const hasCore = !!(val.date && val.summary);
      const allEmpty = !val.date && !val.summary && !val.nextDate && !val.nextObjective;
      return hasCore || allEmpty;
    },
    { message: "Date et résumé requis si un rendez-vous est saisi" }
  );

export const additionalAppointmentSchema = z
  .object({
    date: z.string().trim().optional(),
    summary: z.string().trim().optional(),
    objective: z.string().trim().optional(),
  })
  .refine(
    (val) => {
      const hasCore = !!(val.date && val.summary);
      const allEmpty = !val.date && !val.summary && !val.objective;
      return hasCore || allEmpty;
    },
    { message: "Date et résumé requis ou laissez vide" }
  );

export const contactRecordSchema = z.object({
  company: z.string().min(1, "Entreprise requise"),
  address: z.string().min(1, "Adresse requise"),
  postalCode: z.string().min(2, "Code postal requis"),
  city: z.string().min(1, "Ville requise"),
  status: z.enum(["client", "prospect"]),
  clientSince: z.string().optional(),
  opportunityScore: z.number().int().min(1, "Score min 1").max(10, "Score max 10").optional(),
  primaryContact: contactPersonSchema,
  secondaryContact: optionalContactPersonSchema.optional(),
  additionalContacts: z.array(optionalContactPersonSchema).optional(),
  social: socialInfoSchema.optional(),
  appointment: appointmentSchema.optional(),
  additionalAppointments: z.array(additionalAppointmentSchema).optional(),
});
