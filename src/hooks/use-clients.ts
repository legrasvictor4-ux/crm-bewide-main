import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import type { Client, CreateClientInput, FetchClientsParams, UpdateClientInput } from "@/services/clients";
import { createClient, deleteClient, fetchClients, updateClient } from "@/services/clients";

const CLIENTS_KEY = ["clients"];

export function useClients(params: FetchClientsParams) {
  const key = useMemo(() => [...CLIENTS_KEY, params], [params]);
  return useQuery({
    queryKey: key,
    queryFn: () => fetchClients(params),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 2,
  });
}

export function useCreateClient(options?: UseMutationOptions<Client, Error, CreateClientInput>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateClientInput) => createClient(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEY });
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
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEY });
    },
  });
}
