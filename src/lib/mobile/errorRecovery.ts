import { enqueueAction, getQueue, hasPendingActions, clearQueue } from './offlineStore';
import { safeGetItem, safeSetItem, safeRemoveItem } from './safeStorage';

type CrashSnapshot = {
  route: string;
  draftTranscript: string | null;
  draftCandidate: Record<string, unknown> | null;
  voiceStep: string | null;
  timestamp: number;
};

const CRASH_SNAPSHOT_KEY = 'crash_snapshot';

export function saveCrashSnapshot(snapshot: CrashSnapshot): void {
  safeSetItem(CRASH_SNAPSHOT_KEY, snapshot);
}

export function getCrashSnapshot(): CrashSnapshot | null {
  const result = safeGetItem<CrashSnapshot>(CRASH_SNAPSHOT_KEY);
  return result.success ? result.data : null;
}

export function clearCrashSnapshot(): void {
  safeRemoveItem(CRASH_SNAPSHOT_KEY);
}

export function restoreAfterCrash(): {
  hasRecovery: boolean;
  snapshot: CrashSnapshot | null;
  pendingActions: number;
} {
  const snapshot = getCrashSnapshot();
  const pending = getQueue().length;

  if (snapshot) {
    clearCrashSnapshot();
  }

  return {
    hasRecovery: snapshot !== null,
    snapshot,
    pendingActions: pending,
  };
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Erreur inconnue';
}

export function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('network') ||
      msg.includes('timeout') ||
      msg.includes('offline') ||
      msg.includes('503') ||
      msg.includes('502') ||
      msg.includes('429')
    );
  }
  return false;
}
