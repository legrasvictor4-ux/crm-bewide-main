import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchProximitySuggestions, acceptProximitySuggestion, declineProximitySuggestion } from '@/services/agenda';
import type { ProximitySuggestion, SuggestionBatch } from '@/types/agenda';
import { toast } from 'sonner';

interface UseProximitySuggestionsOptions {
  autoRefresh?: boolean;
  pollIntervalMs?: number;
}

export function useProximitySuggestions(options: UseProximitySuggestionsOptions = {}) {
  const { autoRefresh = true, pollIntervalMs = 30000 } = options;
  const [suggestions, setSuggestions] = useState<ProximitySuggestion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false);
  const [nextCheckAt, setNextCheckAt] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const batch: SuggestionBatch = await fetchProximitySuggestions();
      setSuggestions(batch.suggestions);
      setTotal(batch.total);
      setCooldownActive(batch.cooldownActive);
      setNextCheckAt(batch.nextCheckAt);

      if (batch.suggestions.length > 0 && !batch.cooldownActive) {
        setVisible(true);
      }
    } catch {
      // Silent fail — suggestions are non-blocking
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (autoRefresh && pollIntervalMs > 0) {
      intervalRef.current = setInterval(load, pollIntervalMs);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [autoRefresh, pollIntervalMs, load]);

  const accept = useCallback(
    async (suggestionId: string) => {
      try {
        const result = await acceptProximitySuggestion(suggestionId);
        if (result.success) {
          setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
          setTotal((prev) => Math.max(0, prev - 1));
          toast.success('Rendez-vous déplacé avec succès');
        }
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur';
        toast.error(msg);
        return { success: false };
      }
    },
    [],
  );

  const decline = useCallback(
    async (suggestionId: string, dismiss = false) => {
      try {
        await declineProximitySuggestion(suggestionId, { dismiss, cooldownHours: dismiss ? 0 : 24 });
        setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
        setTotal((prev) => Math.max(0, prev - 1));
        if (dismiss) {
          toast.info('Suggestion ignorée');
        } else {
          toast.info('Suggestion refusée');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur';
        toast.error(msg);
      }
    },
    [],
  );

  const dismiss = useCallback(
    async (suggestionId: string) => {
      await decline(suggestionId, true);
    },
    [decline],
  );

  const hideBanner = useCallback(() => {
    setVisible(false);
  }, []);

  return {
    suggestions,
    total,
    loading,
    cooldownActive,
    nextCheckAt,
    visible,
    showBanner: suggestions.length > 0 && !cooldownActive,
    accept,
    decline,
    dismiss,
    hideBanner,
    refresh: load,
  };
}
