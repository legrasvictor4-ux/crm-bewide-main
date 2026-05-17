import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { createClient as createClientImpl, deleteClient as deleteClientImpl, fetchClients as fetchClientsImpl, updateClient as updateClientImpl } from "@/services/clientsAdapter";

export type Client = Tables<"clients">;
export type CreateClientInput = TablesInsert<"clients">;
export type UpdateClientInput = TablesUpdate<"clients">;

export interface FetchClientsParams {
  filter?: Client["status"] | Client["statut_opportunite"] | "all";
  filterField?: "status" | "statut_opportunite";
  search?: string;
  signal?: AbortSignal;
}

export const fetchClients = fetchClientsImpl;
export const createClient = createClientImpl;
export const updateClient = updateClientImpl;
export const deleteClient = deleteClientImpl;
