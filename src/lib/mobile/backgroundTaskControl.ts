type TaskEntry = {
  id: string;
  type: 'timeout' | 'interval' | 'raf' | 'listener';
  ref: number | (() => void);
  createdAt: number;
  description: string;
};

const activeTasks = new Map<string, TaskEntry>();
let taskCounter = 0;

function generateId(type: TaskEntry['type']): string {
  taskCounter++;
  return `${type}_${Date.now()}_${taskCounter}`;
}

export function trackTimeout(fn: () => void, ms: number, description = 'anonymous'): number {
  const id = generateId('timeout');
  const wrapped = () => {
    activeTasks.delete(id);
    fn();
  };
  const ref = window.setTimeout(wrapped, ms);
  activeTasks.set(id, { id, type: 'timeout', ref, createdAt: Date.now(), description });
  return ref;
}

export function trackInterval(fn: () => void, ms: number, description = 'anonymous'): number {
  const id = generateId('interval');
  const ref = window.setInterval(fn, ms);
  activeTasks.set(id, { id, type: 'interval', ref, createdAt: Date.now(), description });
  return ref;
}

export function clearTrackedTask(id: number): void {
  for (const [key, entry] of activeTasks) {
    if (entry.ref === id) {
      if (entry.type === 'timeout') window.clearTimeout(id);
      else if (entry.type === 'interval') window.clearInterval(id);
      activeTasks.delete(key);
      return;
    }
  }
}

export function clearAllTrackedTasks(): void {
  for (const [, entry] of activeTasks) {
    if (entry.type === 'timeout') window.clearTimeout(entry.ref as number);
    else if (entry.type === 'interval') window.clearInterval(entry.ref as number);
  }
  activeTasks.clear();
}

export function getActiveTaskCount(): number {
  return activeTasks.size;
}

export function getActiveTasks(): TaskEntry[] {
  return Array.from(activeTasks.values());
}

export function suspendAllTimers(): void {
  for (const [, entry] of activeTasks) {
    if (entry.type === 'timeout' || entry.type === 'interval') {
      window.clearTimeout(entry.ref as number);
      window.clearInterval(entry.ref as number);
    }
  }
}

export function resumeTracking(): void {
}
