/**
 * Sync operation queue with retry logic for Google Calendar operations.
 * Operations are processed asynchronously with exponential backoff.
 */

const ops = new Map();
let idCounter = 0;
const MAX_RETRIES = 3;
const BASE_DELAY = 2000;

export function generateOpId() {
  return `sync_${Date.now()}_${++idCounter}`;
}

/**
 * Enqueue a sync operation.
 */
export function enqueue({ id = generateOpId(), userId, action, eventId, googleEventId, payload, direction = 'crm_to_google' }) {
  const op = {
    id,
    userId,
    action,       // 'created' | 'updated' | 'deleted' | 'moved'
    eventId,
    googleEventId: googleEventId || null,
    payload: payload || null,
    direction,
    status: 'pending',
    retryCount: 0,
    maxRetries: MAX_RETRIES,
    errorMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  ops.set(id, op);
  return op;
}

/**
 * Mark an operation as completed (remove from queue).
 */
export function markCompleted(opId) {
  ops.delete(opId);
}

/**
 * Mark an operation as failed, incrementing retry count.
 * If max retries exceeded, marks as permanently failed.
 */
export function markFailed(opId, errorMessage) {
  const op = ops.get(opId);
  if (!op) return null;

  op.retryCount++;
  op.errorMessage = errorMessage;
  op.updatedAt = new Date().toISOString();

  if (op.retryCount >= op.maxRetries) {
    op.status = 'failed';
  } else {
    op.status = 'pending'; // Will be retried
  }

  return op;
}

/**
 * Get all pending operations sorted by creation time (FIFO).
 */
export function getPendingOps() {
  return [...ops.values()]
    .filter((o) => o.status === 'pending')
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

/**
 * Get failed operations.
 */
export function getFailedOps() {
  return [...ops.values()].filter((o) => o.status === 'failed');
}

/**
 * Get queue statistics.
 */
export function getQueueStats() {
  const all = [...ops.values()];
  return {
    total: all.length,
    pending: all.filter((o) => o.status === 'pending').length,
    failed: all.filter((o) => o.status === 'failed').length,
  };
}

/**
 * Compute exponential backoff delay for retry.
 */
export function getRetryDelay(retryCount) {
  return BASE_DELAY * Math.pow(2, retryCount) + Math.random() * 1000;
}

/**
 * Clear all completed/failed operations older than N hours.
 */
export function clearStaleOps(maxAgeHours = 24) {
  const cutoff = Date.now() - maxAgeHours * 3600000;
  for (const [id, op] of ops) {
    if (new Date(op.createdAt).getTime() < cutoff) {
      ops.delete(id);
    }
  }
}

/**
 * Clear all operations (for testing).
 */
export function clearAllOps() {
  ops.clear();
}
