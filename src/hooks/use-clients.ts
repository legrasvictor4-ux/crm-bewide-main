import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import type { Client, CreateClientInput, FetchClientsParams, UpdateClientInput } from "@/services/clients";
import { createClient, deleteClient, fetchClients, updateClient } from "@/services/clients";
import { useSupabaseReady } from "@/hooks/useSupabaseReady";
import { ApiError } from "@/types/api";

const CLIENTS_KEY = ["clients"];

export function useClients(params: FetchClientsParams) {
  const ready = useSupabaseReady();
  const key = useMemo(() => [...CLIENTS_KEY, params], [params]);
  return useQuery({
    queryKey: key,
    queryFn: () => fetchClients(params),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
    enabled: ready,
  });
}

export function useCreateClient(options?: UseMutationOptions<Client, Error, CreateClientInput>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateClientInput) => createClient(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEY });
      queryClient.invalidateQueries({ queryKey: ["analytics-clients"] });
      queryClient.invalidateQueries({ queryKey: ["agenda"] });
    },
    ...options,
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientInput }) => updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEY });
      queryClient.invalidateQueries({ queryKey: ["analytics-clients"] });
      queryClient.invalidateQueries({ queryKey: ["agenda"] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: (_, id) => {
      queryClient.setQueriesData({ queryKey: CLIENTS_KEY }, (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return old.filter((item: any) => item?.id !== id);
      });
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEY });
      queryClient.invalidateQueries({ queryKey: ["analytics-clients"] });
      queryClient.invalidateQueries({ queryKey: ["agenda"] });
    },
    onError: (error, id) => {
      if (error instanceof ApiError && error.code === "CLIENT_NOT_FOUND") {
        queryClient.setQueriesData({ queryKey: CLIENTS_KEY }, (old: unknown) => {
          if (!Array.isArray(old)) return old;
          return old.filter((item: any) => item?.id !== id);
        });
        queryClient.invalidateQueries({ queryKey: CLIENTS_KEY });
        queryClient.invalidateQueries({ queryKey: ["analytics-clients"] });
        queryClient.invalidateQueries({ queryKey: ["agenda"] });
        return;
      }
    },
  });
}
