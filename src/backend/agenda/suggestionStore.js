/**
 * In-memory suggestion store with persistence planning for Supabase.
 * Tracks suggestions, cooldowns, and user decisions.
 */

const suggestions = new Map();   // suggestionId -> suggestion
const cooldowns = new Map();    // targetEventId -> cooldownUntil (ISO string)
const decisions = new Map();    // suggestionId -> 'accepted' | 'declined' | 'dismissed'

let idCounter = 0;

function generateId() {
  return `sug_${Date.now()}_${++idCounter}`;
}

/**
 * Store new proximity suggestions, respecting cooldowns and dedup.
 * Returns only fresh suggestions that pass cooldown check.
 */
export function storeSuggestions(userId, rawSuggestions) {
  const fresh = [];

  for (const s of rawSuggestions) {
    // Check cooldown on target event
    const cooldownUntil = cooldowns.get(s.targetEventId);
    if (cooldownUntil && new Date(cooldownUntil) > new Date()) continue;

    // Dedup: check if we already suggested this exact pair
    const exists = [...suggestions.values()].some(
      (existing) =>
        existing.sourceEventId === s.sourceEventId &&
        existing.targetEventId === s.targetEventId &&
        existing.status === 'pending',
    );
    if (exists) continue;

    const id = generateId();
    const now = new Date().toISOString();
    const suggestion = {
      id,
      userId,
      sourceEventId: s.sourceEventId,
      targetEventId: s.targetEventId,
      sourceDate: s.sourceDate,
      targetDate: s.targetDate,
      proposedDate: s.proposedDate,
      distanceKm: s.distanceKm,
      travelTimeMinutes: s.travelTimeMinutes,
      relevanceScore: s.relevanceScore,
      reason: s.reason,
      status: 'pending',
      cooldownUntil: null,
      createdAt: now,
      updatedAt: now,
    };

    suggestions.set(id, suggestion);
    fresh.push(suggestion);
  }

  return fresh;
}

/**
 * Accept a suggestion: move the target event to the proposed date.
 * Returns the suggestion + appointment update instructions.
 */
export function acceptSuggestion(suggestionId) {
  const sug = suggestions.get(suggestionId);
  if (!sug) return { success: false, error: 'Suggestion not found' };
  if (sug.status !== 'pending') return { success: false, error: `Suggestion already ${sug.status}` };

  sug.status = 'accepted';
  sug.updatedAt = new Date().toISOString();
  decisions.set(suggestionId, 'accepted');

  return {
    success: true,
    suggestion: sug,
    update: {
      eventId: sug.targetEventId,
      newStart: sug.proposedDate,
    },
  };
}

/**
 * Decline or dismiss a suggestion, optionally setting a cooldown.
 */
export function declineSuggestion(suggestionId, { cooldownHours = 24, dismiss = false } = {}) {
  const sug = suggestions.get(suggestionId);
  if (!sug) return { success: false, error: 'Suggestion not found' };
  if (sug.status !== 'pending') return { success: false, error: `Suggestion already ${sug.status}` };

  sug.status = dismiss ? 'dismissed' : 'declined';
  sug.updatedAt = new Date().toISOString();
  decisions.set(suggestionId, sug.status);

  if (cooldownHours > 0) {
    const until = new Date(Date.now() + cooldownHours * 3600000).toISOString();
    sug.cooldownUntil = until;
    cooldowns.set(sug.targetEventId, until);
  }

  return { success: true, suggestion: sug };
}

/**
 * Get pending suggestions for a user, sorted by relevance.
 */
export function getPendingSuggestions(userId, limit = 10) {
  const pending = [...suggestions.values()]
    .filter((s) => s.userId === userId && s.status === 'pending')
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);

  const activeCooldowns = [...cooldowns.entries()]
    .filter(([, until]) => new Date(until) > new Date())
    .map(([eventId]) => eventId);

  return {
    suggestions: pending,
    total: pending.length,
    cooldownActive: activeCooldowns.length > 0,
    nextCheckAt: activeCooldowns.length > 0
      ? [...cooldowns.entries()]
          .filter(([, until]) => new Date(until) > new Date())
          .sort(([, a], [, b]) => new Date(a) - new Date(b))[0][1]
      : null,
  };
}

/**
 * Get the decision history for audit purposes.
 */
export function getDecisionHistory(userId, limit = 20) {
  return [...suggestions.values()]
    .filter((s) => s.userId === userId && s.status !== 'pending')
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, limit);
}

/**
 * Clear stale suggestions (older than N hours).
 */
export function clearStaleSuggestions(maxAgeHours = 48) {
  const cutoff = Date.now() - maxAgeHours * 3600000;
  for (const [id, s] of suggestions) {
    if (new Date(s.createdAt).getTime() < cutoff) {
      suggestions.delete(id);
      decisions.delete(id);
    }
  }
}

/**
 * Clear all data (for testing).
 */
export function clearAll() {
  suggestions.clear();
  cooldowns.clear();
  decisions.clear();
}
