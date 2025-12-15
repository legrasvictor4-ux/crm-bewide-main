import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { ApiError } from "@/types/api";

export type Client = Tables<"clients">;
export type CreateClientInput = TablesInsert<"clients">;
export type UpdateClientInput = TablesUpdate<"clients">;

export interface FetchClientsParams {
  filter?: Client["status"] | "all";
  minScore?: number;
  sortByScore?: boolean;
  search?: string;
  signal?: AbortSignal;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 250): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await wait(delay);
    return withRetry(fn, retries - 1, delay * 2);
  }
}

export async function fetchClients(params: FetchClientsParams = {}): Promise<Client[]> {
  const { filter = "all", minScore = 0, sortByScore = false, search = "" } = params;

  return withRetry(async () => {
    let query = supabase
      .from("clients")
      .select("*")
      .order(sortByScore ? "lead_score" : "date_created", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data, error } = await query;
    if (error) {
      throw new ApiError(error.message, 500, "CLIENTS_FETCH_FAILED", error);
    }

    const term = search.toLowerCase();
    return (data || []).filter((client) => {
      const scoreOk = (client.lead_score ?? 0) >= minScore;
      const termOk =
        !term ||
        (client.company || `${client.first_name || ""} ${client.last_name || ""}`.trim()).toLowerCase().includes(term);
      return scoreOk && termOk;
    });
  });
}

export async function createClient(payload: CreateClientInput): Promise<Client> {
  return withRetry(async () => {
    const { data, error } = await supabase.from("clients").insert(payload).select().single();
    if (error) {
      throw new ApiError(error.message, 400, "CLIENT_CREATE_FAILED", error);
    }
    if (!data) {
      throw new ApiError("Client creation failed", 500, "CLIENT_CREATE_EMPTY");
    }
    return data;
  });
}

export async function updateClient(id: string, payload: UpdateClientInput): Promise<Client> {
  return withRetry(async () => {
    const { data, error } = await supabase.from("clients").update(payload).eq("id", id).select().single();
    if (error) {
      throw new ApiError(error.message, 400, "CLIENT_UPDATE_FAILED", error);
    }
    if (!data) {
      throw new ApiError("Client update failed", 500, "CLIENT_UPDATE_EMPTY");
    }
    return data;
  });
}

export async function deleteClient(id: string): Promise<void> {
  return withRetry(async () => {
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) {
      throw new ApiError(error.message, 400, "CLIENT_DELETE_FAILED", error);
    }
  });
}
