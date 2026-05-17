import { safeGetItem, safeSetItem, safeRemoveItem } from './safeStorage';

type OfflineAction = {
  id: string;
  type: 'CREATE_CLIENT' | 'UPDATE_CLIENT' | 'DELETE_CLIENT' | 'SYNC_VOICE_NOTE';
  payload: unknown;
  timestamp: number;
  retries: number;
  maxRetries: number;
};

const QUEUE_KEY = 'offline_queue';
const MAX_RETRIES_DEFAULT = 5;

let queue: OfflineAction[] = loadQueue();

function loadQueue(): OfflineAction[] {
  const result = safeGetItem<OfflineAction[]>(QUEUE_KEY);
  return result.success ? result.data : [];
}

function persistQueue(): void {
  safeSetItem(QUEUE_KEY, queue);
}

export function enqueueAction(type: OfflineAction['type'], payload: unknown, maxRetries = MAX_RETRIES_DEFAULT): string {
  const id = `off_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  queue.push({ id, type, payload, timestamp: Date.now(), retries: 0, maxRetries });
  persistQueue();
  return id;
}

export function dequeueAction(id: string): void {
  queue = queue.filter((a) => a.id !== id);
  persistQueue();
}

export function getQueue(): readonly OfflineAction[] {
  return queue;
}

export function getQueueSize(): number {
  return queue.length;
}

export function incrementRetry(id: string): boolean {
  const action = queue.find((a) => a.id === id);
  if (!action) return false;
  action.retries++;
  if (action.retries > action.maxRetries) {
    dequeueAction(id);
    return false;
  }
  persistQueue();
  return true;
}

export function clearQueue(): void {
  queue = [];
  safeRemoveItem(QUEUE_KEY);
}

export function hasPendingActions(): boolean {
  return queue.length > 0;
}
