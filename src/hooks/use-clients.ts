import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import type { Client, CreateClientInput, FetchClientsParams, UpdateClientInput } from "@/services/clients";
import { createClient, deleteClient, fetchClients, updateClient } from "@/services/clients";
import { createAgendaEvent } from "@/services/agenda";
import { useSupabaseReady } from "@/hooks/useSupabaseReady";
import { ApiError } from "@/types/api";
import type { CreateAgendaEvent } from "@/types/agenda";

const CLIENTS_KEY = ["clients"];

function createRelanceAgendaEvent(client: Client): void {
  if (!client.date_relance || !client.id || !client.name) return;
  const startDate = new Date(client.date_relance);
  if (isNaN(startDate.getTime())) return;
  startDate.setHours(10, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setHours(11, 0, 0, 0);
  const agendaEvent: CreateAgendaEvent = {
    clientId: client.id,
    title: `Relance - ${client.name}`,
    type: "rappel",
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    durationMinutes: 60,
    bufferMinutes: 10,
    opportunityScore: 0,
    priority: "normal",
    description: `Relance automatique depuis la fiche client ${client.name}`,
    address: client.address ?? "",
  };
  createAgendaEvent(agendaEvent).catch((err) =>
    console.error("[AUTO-AGENDA] Échec création relance:", err)
  );
}

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEY });
      queryClient.invalidateQueries({ queryKey: ["analytics-clients"] });
      queryClient.invalidateQueries({ queryKey: ["agenda"] });
      createRelanceAgendaEvent(data);
    },
    ...options,
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientInput }) => updateClient(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEY });
      queryClient.invalidateQueries({ queryKey: ["analytics-clients"] });
      queryClient.invalidateQueries({ queryKey: ["agenda"] });
      createRelanceAgendaEvent(data);
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
