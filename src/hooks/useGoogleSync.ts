import { useState, useEffect, useCallback, useRef } from 'react';
import { getSyncStatus, connectGoogleCalendar, disconnectGoogleCalendar, triggerManualSync } from '@/services/agenda';
import type { SyncStatus } from '@/types/agenda';
import { toast } from 'sonner';

export function useGoogleSync(autoRefresh = true) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const s = await getSyncStatus();
      setStatus(s);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(loadStatus, 30000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [autoRefresh, loadStatus]);

  const connect = useCallback(async () => {
    try {
      setConnecting(true);
      const result = await connectGoogleCalendar();
      if (result.authUrl) {
        window.open(result.authUrl, '_blank', 'width=600,height=700');
        toast.success('Redirection vers Google Calendar...');
      }
      await loadStatus();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur connexion';
      toast.error(msg);
    } finally {
      setConnecting(false);
    }
  }, [loadStatus]);

  const disconnect = useCallback(async () => {
    try {
      await disconnectGoogleCalendar();
      toast.success('Google Calendar déconnecté');
      await loadStatus();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur déconnexion';
      toast.error(msg);
    }
  }, [loadStatus]);

  const manualSync = useCallback(async () => {
    try {
      const result = await triggerManualSync();
      toast.success(`${result.eventsSynced} événements synchronisés`);
      await loadStatus();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur synchronisation';
      toast.error(msg);
    }
  }, [loadStatus]);

  return {
    status,
    loading,
    connecting,
    connected: status?.connected ?? false,
    provider: status?.provider ?? 'none',
    connect,
    disconnect,
    manualSync,
    refresh: loadStatus,
  };
}
