const STORAGE_PREFIX = 'bewide_';
const MIGRATION_KEY = `${STORAGE_PREFIX}storage_version`;

type StorageMigration = {
  version: number;
  migrate: (data: Record<string, string>) => Record<string, string>;
};

const migrations: StorageMigration[] = [];

export function registerMigration(version: number, migrate: (data: Record<string, string>) => Record<string, string>): void {
  migrations.push({ version, migrate });
}

function getCurrentVersion(): number {
  try {
    return parseInt(localStorage.getItem(MIGRATION_KEY) ?? '0', 10);
  } catch { return 0; }
}

function runMigrations(): void {
  const current = getCurrentVersion();
  const pending = migrations.filter((m) => m.version > current).sort((a, b) => a.version - b.version);

  if (pending.length === 0) return;

  let data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      data[key] = localStorage.getItem(key) ?? '';
    }
  }

  for (const m of pending) {
    try {
      data = m.migrate(data);
      localStorage.setItem(MIGRATION_KEY, String(m.version));
    } catch (err) {
      console.error('[SAFE_STORAGE] Migration failed:', m.version, err);
      break;
    }
  }

  for (const [key, value] of Object.entries(data)) {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
  }
}

export type StorageResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: 'PARSE' | 'QUOTA' | 'UNAVAILABLE' | 'NOT_FOUND' };

export function initSafeStorage(): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}_probe`, '1');
    localStorage.removeItem(`${STORAGE_PREFIX}_probe`);
    runMigrations();
  } catch {
    console.error('[SAFE_STORAGE] localStorage not available');
  }
}

export function safeGetItem<T>(key: string): StorageResult<T> {
  const prefixed = `${STORAGE_PREFIX}${key}`;
  try {
    const raw = localStorage.getItem(prefixed);
    if (raw === null) {
      return { success: false, error: `Key not found: ${key}`, code: 'NOT_FOUND' };
    }
    const data = JSON.parse(raw) as T;
    return { success: true, data };
  } catch (err) {
    const message = err instanceof SyntaxError ? 'Parse error' : 'Storage unavailable';
    const code = err instanceof SyntaxError ? 'PARSE' : 'UNAVAILABLE' as const;
    return { success: false, error: `${message}: ${key}`, code };
  }
}

export function safeSetItem<T>(key: string, value: T): StorageResult<T> {
  const prefixed = `${STORAGE_PREFIX}${key}`;
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(prefixed, serialized);
    return { success: true, data: value };
  } catch (err) {
    const isQuota = err instanceof DOMException && err.name === 'QuotaExceededError';
    return {
      success: false,
      error: isQuota ? 'Quota exceeded' : 'Storage unavailable',
      code: isQuota ? 'QUOTA' : 'UNAVAILABLE',
    };
  }
}

export function safeRemoveItem(key: string): boolean {
  const prefixed = `${STORAGE_PREFIX}${key}`;
  try {
    localStorage.removeItem(prefixed);
    return true;
  } catch { return false; }
}

export function safeClear(prefix?: string): void {
  const p = `${STORAGE_PREFIX}${prefix ?? ''}`;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(p)) keysToRemove.push(key);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
}
