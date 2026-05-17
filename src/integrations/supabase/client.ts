import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '[Supabase] VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont obligatoires dans .env'
  );
}

try {
  new URL(SUPABASE_URL);
} catch {
  throw new Error(`[Supabase] VITE_SUPABASE_URL invalide : "${SUPABASE_URL}"`);
}

// Purge des tokens Supabase obsolètes pour éviter la boucle refresh_token infinie.
// Supprime : (1) tokens d'autres projets, (2) tokens du projet courant déjà expirés.
try {
  const currentRef = new URL(SUPABASE_URL).hostname.split('.')[0];
  const nowSec = Date.now() / 1000;
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith('sb-') || !key.endsWith('-auth-token')) continue;
    if (!key.startsWith(`sb-${currentRef}-`)) {
      localStorage.removeItem(key);
      continue;
    }
    try {
      const stored = JSON.parse(localStorage.getItem(key) ?? '{}');
      const expiresAt: number = stored?.expires_at ?? 0;
      if (expiresAt && nowSec > expiresAt) {
        localStorage.removeItem(key);
      }
    } catch {
      localStorage.removeItem(key);
    }
  }
} catch { /* localStorage indisponible (SSR/test) */ }

type Unsubscribe = () => void;
type ReadyCallback = () => void;

let _listeners: Set<ReadyCallback> | null = null;

export let isSupabaseReady = false;

export function onSupabaseReady(cb: ReadyCallback): Unsubscribe {
  if (isSupabaseReady) {
    cb();
    return () => {};
  }
  if (!_listeners) _listeners = new Set();
  _listeners.add(cb);
  return () => { _listeners?.delete(cb); };
}

function notifyReady(): void {
  isSupabaseReady = true;
  if (_listeners) {
    _listeners.forEach((cb) => cb());
    _listeners.clear();
  }
}

let _resolveReady!: (value: boolean) => void;
export const whenSupabaseReady = new Promise<boolean>((resolve) => {
  _resolveReady = resolve;
});

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Signal que le client Supabase est prêt à être utilisé.
// Les queries doivent attendre whenSupabaseReady avant de s'exécuter.
notifyReady();
_resolveReady(true);