import { z } from "zod";

export const ClientSchema = z.object({
  id: z.string().optional(),

  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),

  status: z.enum(["prospect", "activé", "client actif", "perdu"]),

  role: z
    .enum(["patron", "manager", "salarié", "autre", "NC"])
    .nullable()
    .optional(),

  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),

  statut_opportunite: z.enum(["chaud", "tiède", "froid", "perdu", "gagné"]).nullable().optional(),
  priorite: z.enum(["haute", "moyenne", "basse"]).nullable().optional(),

  motif_objection: z.string().nullable().optional(),
  date_relance: z.string().nullable().optional(),
  offre_cible: z
    .enum(["Essentiel", "VIP trimestre", "VIP bimestriel", "À qualifier"])
    .nullable()
    .optional(),
  canal_acquisition: z.enum(["terrain", "référence", "À qualifier"]).nullable().optional(),
});

export type Client = z.infer<typeof ClientSchema>;
