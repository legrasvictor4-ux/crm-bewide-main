import { ApiError } from '@/types/api';
import type { AgendaEvent, CreateAgendaEvent, UpdateAgendaEvent, ProximitySuggestion, ProximityCheckResult, SuggestionBatch, SyncStatus, CalendarSettings } from '@/types/agenda';

// ─── Appointments CRUD ──────────────────────────────────────────────────────

export async function fetchAgendaEvents(params?: { timeMin?: string; timeMax?: string }): Promise<AgendaEvent[]> {
  const qs = new URLSearchParams();
  if (params?.timeMin) qs.set('timeMin', params.timeMin);
  if (params?.timeMax) qs.set('timeMax', params.timeMax);
  const url = `/api/agenda/events${qs.toString() ? `?${qs}` : ''}`;

  const res = await fetch(url);
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError(payload.error?.message || 'Erreur chargement agenda', res.status);
  }
  return res.json();
}

export async function createAgendaEvent(event: CreateAgendaEvent): Promise<AgendaEvent> {
  const res = await fetch('/api/agenda/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError(payload.error?.message || 'Erreur création rendez-vous', res.status);
  }
  return res.json();
}

export async function updateAgendaEvent(id: string, data: UpdateAgendaEvent): Promise<AgendaEvent> {
  const res = await fetch(`/api/agenda/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError(payload.error?.message || 'Erreur modification rendez-vous', res.status);
  }
  return res.json();
}

export async function deleteAgendaEvent(id: string): Promise<void> {
  const res = await fetch(`/api/agenda/events/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError(payload.error?.message || 'Erreur suppression rendez-vous', res.status);
  }
}

// ─── Proximity Suggestions ──────────────────────────────────────────────────

export async function fetchProximitySuggestions(): Promise<SuggestionBatch> {
  const res = await fetch('/api/agenda/suggestions');
  if (!res.ok) throw new ApiError('Erreur chargement suggestions', res.status);
  return res.json();
}

export async function acceptProximitySuggestion(suggestionId: string): Promise<{ success: boolean; event: AgendaEvent }> {
  const res = await fetch(`/api/agenda/suggestions/${suggestionId}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError(payload.error?.message || 'Erreur acceptation suggestion', res.status);
  }
  return res.json();
}

export async function declineProximitySuggestion(
  suggestionId: string,
  options?: { cooldownHours?: number; dismiss?: boolean },
): Promise<{ success: boolean }> {
  const res = await fetch(`/api/agenda/suggestions/${suggestionId}/decline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cooldownHours: options?.cooldownHours ?? 24, dismiss: options?.dismiss ?? false }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError(payload.error?.message || 'Erreur refus suggestion', res.status);
  }
  return res.json();
}

// ─── Google Calendar Sync ───────────────────────────────────────────────────

export async function getSyncStatus(): Promise<SyncStatus> {
  const res = await fetch('/api/agenda/sync/status');
  if (!res.ok) throw new ApiError('Erreur statut synchronisation', res.status);
  return res.json();
}

export async function connectGoogleCalendar(): Promise<{ authUrl: string }> {
  const res = await fetch('/api/agenda/sync/google/connect');
  if (!res.ok) throw new ApiError('Erreur connexion Google Calendar', res.status);
  return res.json();
}

export async function disconnectGoogleCalendar(): Promise<{ success: boolean }> {
  const res = await fetch('/api/agenda/sync/google/disconnect', { method: 'POST' });
  if (!res.ok) throw new ApiError('Erreur déconnexion Google Calendar', res.status);
  return res.json();
}

export async function triggerManualSync(): Promise<{ success: boolean; eventsSynced: number }> {
  const res = await fetch('/api/agenda/sync/run', { method: 'POST' });
  if (!res.ok) throw new ApiError('Erreur synchronisation', res.status);
  return res.json();
}

// ─── Settings ───────────────────────────────────────────────────────────────

export async function getCalendarSettings(): Promise<CalendarSettings> {
  const res = await fetch('/api/agenda/settings');
  if (!res.ok) throw new ApiError('Erreur chargement paramètres', res.status);
  return res.json();
}

export async function updateCalendarSettings(settings: Partial<CalendarSettings>): Promise<CalendarSettings> {
  const res = await fetch('/api/agenda/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError(payload.error?.message || 'Erreur sauvegarde paramètres', res.status);
  }
  return res.json();
}
