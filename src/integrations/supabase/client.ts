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

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});