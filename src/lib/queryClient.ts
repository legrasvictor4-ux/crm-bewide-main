import { QueryCache, MutationCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Centralized QueryClient with retry/backoff and error surface
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 1,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Erreur lors du chargement des donnees";
      toast.error(message);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Echec de l'action";
      toast.error(message);
    },
    onSuccess: () => {
      // optional global success handling hook
    },
  }),
});
