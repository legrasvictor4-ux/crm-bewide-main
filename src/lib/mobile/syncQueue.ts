import { enqueueAction, dequeueAction, getQueue, incrementRetry, clearQueue } from './offlineStore';

type SyncHandler = (action: { type: string; payload: unknown }) => Promise<boolean>;

const handlers = new Map<string, SyncHandler>();

export function registerSyncHandler(type: string, handler: SyncHandler): void {
  handlers.set(type, handler);
}

export function unregisterSyncHandler(type: string): void {
  handlers.delete(type);
}

export async function processQueue(): Promise<{ success: number; failed: number; skipped: number }> {
  const queue = getQueue();
  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const action of queue) {
    const handler = handlers.get(action.type);
    if (!handler) {
      skipped++;
      continue;
    }

    try {
      const result = await handler(action);
      if (result) {
        dequeueAction(action.id);
        success++;
      } else {
        const canRetry = incrementRetry(action.id);
        if (!canRetry) failed++;
        else skipped++;
      }
    } catch {
      const canRetry = incrementRetry(action.id);
      if (!canRetry) failed++;
      else skipped++;
    }
  }

  return { success, failed, skipped };
}

export async function syncWithBackoff(maxRetries = 3): Promise<{ success: boolean; result: Awaited<ReturnType<typeof processQueue>> }> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await processQueue();
    if (result.failed === 0 && result.skipped === 0) {
      return { success: true, result };
    }
    if (attempt < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }

  return { success: false, result: await processQueue() };
}

export function resetSync(): void {
  clearQueue();
}
