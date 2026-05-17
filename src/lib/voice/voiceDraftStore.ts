import logger from "@/lib/logger";
import type { Client } from "@/schema/clientSchema";

// ─── Types ────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "voice_draft";

export interface VoiceDraft {
  id: string;
  transcript: string;
  candidate: Record<string, unknown> | null;
  step: string;
  timestamp: number;
  saved: boolean;
}

// ─── Store localStorage ──────────────────────────────────────────────────────

function generateId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function readAll(): VoiceDraft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeAll(drafts: VoiceDraft[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch (err) {
    logger.voice.warn("voiceDraftStore", "Écriture localStorage échouée", {
      error: err instanceof Error ? err.message : "unknown",
    });
  }
}

// ─── API publique ────────────────────────────────────────────────────────────

export function saveDraft(draft: Omit<VoiceDraft, "id" | "timestamp">): VoiceDraft {
  const entry: VoiceDraft = {
    ...draft,
    id: generateId(),
    timestamp: Date.now(),
  };

  const all = readAll();
  // Garder max 5 drafts
  all.unshift(entry);
  const trimmed = all.slice(0, 5);
  writeAll(trimmed);

  logger.voice.info("voiceDraftStore", "Draft sauvegardé", {
    draftId: entry.id,
    step: entry.step,
    transcriptLength: entry.transcript.length,
  });

  return entry;
}

export function updateDraft(id: string, updates: Partial<VoiceDraft>): VoiceDraft | null {
  const all = readAll();
  const idx = all.findIndex(d => d.id === id);
  if (idx === -1) return null;

  all[idx] = { ...all[idx], ...updates, timestamp: Date.now() };
  writeAll(all);
  return all[idx];
}

export function getDraft(id: string): VoiceDraft | null {
  return readAll().find(d => d.id === id) ?? null;
}

export function listDrafts(): VoiceDraft[] {
  return readAll();
}

export function deleteDraft(id: string): boolean {
  const all = readAll();
  const filtered = all.filter(d => d.id !== id);
  if (filtered.length === all.length) return false;
  writeAll(filtered);
  return true;
}

export function clearDrafts(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

export function getLastDraft(): VoiceDraft | null {
  const all = readAll();
  return all[0] ?? null;
}

export function hasUnsavedDraft(): boolean {
  const all = readAll();
  return all.some(d => !d.saved);
}
