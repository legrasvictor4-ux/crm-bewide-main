import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAgendaEvents, createAgendaEvent, updateAgendaEvent, deleteAgendaEvent } from '@/services/agenda';
import type { AgendaEvent, CreateAgendaEvent, UpdateAgendaEvent } from '@/types/agenda';
import { toast } from 'sonner';

interface UseAgendaOptions {
  timeMin?: string;
  timeMax?: string;
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
}

export function useAgenda(options: UseAgendaOptions = {}) {
  const { timeMin, timeMax, autoRefresh = false, refreshIntervalMs = 60000 } = options;
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAgendaEvents({ timeMin, timeMax });
      setEvents(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur chargement agenda';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [timeMin, timeMax]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (autoRefresh && refreshIntervalMs > 0) {
      intervalRef.current = setInterval(load, refreshIntervalMs);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [autoRefresh, refreshIntervalMs, load]);

  const create = useCallback(async (data: CreateAgendaEvent): Promise<AgendaEvent | null> => {
    try {
      const created = await createAgendaEvent(data);
      setEvents((prev) => [...prev, created]);
      toast.success('Rendez-vous créé');
      return created;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur création';
      toast.error(msg);
      return null;
    }
  }, []);

  const update = useCallback(async (id: string, data: UpdateAgendaEvent): Promise<AgendaEvent | null> => {
    try {
      const updated = await updateAgendaEvent(id, data);
      setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
      toast.success('Rendez-vous mis à jour');
      return updated;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur modification';
      toast.error(msg);
      return null;
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteAgendaEvent(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      toast.success('Rendez-vous supprimé');
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur suppression';
      toast.error(msg);
      return false;
    }
  }, []);

  const getEventsForDay = useCallback(
    (date: Date): AgendaEvent[] => {
      const dayKey = date.toISOString().slice(0, 10);
      return events.filter((e) => e.start.slice(0, 10) === dayKey);
    },
    [events],
  );

  const getEventsForWeek = useCallback(
    (weekStart: Date): AgendaEvent[] => {
      const startKey = weekStart.toISOString().slice(0, 10);
      const end = new Date(weekStart);
      end.setDate(end.getDate() + 7);
      const endKey = end.toISOString().slice(0, 10);
      return events.filter((e) => e.start.slice(0, 10) >= startKey && e.start.slice(0, 10) < endKey);
    },
    [events],
  );

  return {
    events,
    loading,
    error,
    refresh: load,
    create,
    update,
    remove,
    getEventsForDay,
    getEventsForWeek,
  };
}
