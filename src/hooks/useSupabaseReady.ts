import { useSyncExternalStore } from "react";
import { isSupabaseReady, onSupabaseReady } from "@/integrations/supabase/client";

function subscribe(cb: () => void): () => void {
  return onSupabaseReady(cb);
}

function getSnapshot(): boolean {
  return isSupabaseReady;
}

export function useSupabaseReady(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
