/**
 * Google Calendar sync engine.
 * Handles OAuth2 token management, event CRUD, and webhook push notifications.
 * Uses the Google Calendar API v3 via fetch() to avoid heavy SDK dependency.
 */

const GOOGLE_CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_OAUTH_TOKEN = 'https://oauth2.googleapis.com/token';

// ─── Token management ───────────────────────────────────────────────────────

let storedTokens = new Map(); // userId -> { accessToken, refreshToken, expiresAt }

/**
 * Exchange an authorization code for access + refresh tokens.
 * Called after the user completes the OAuth consent screen.
 */
export async function exchangeAuthCode(code, redirectUri) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set');
  }

  const res = await fetch(GOOGLE_OAUTH_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google OAuth token exchange failed: ${err}`);
  }

  return res.json();
}

/**
 * Refresh an access token using the refresh token.
 */
export async function refreshAccessToken(refreshToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  const res = await fetch(GOOGLE_OAUTH_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token refresh failed: ${err}`);
  }

  return res.json();
}

/**
 * Store tokens for a user.
 */
export function setUserTokens(userId, { access_token, refresh_token, expires_in }) {
  storedTokens.set(userId, {
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresAt: Date.now() + (expires_in || 3600) * 1000,
  });
}

/**
 * Get a valid access token for a user, refreshing if necessary.
 */
export async function getValidAccessToken(userId) {
  const tokens = storedTokens.get(userId);
  if (!tokens) throw new Error('No Google tokens for user');

  // If token is still valid (5 min buffer), return it
  if (tokens.accessToken && tokens.expiresAt > Date.now() + 300000) {
    return tokens.accessToken;
  }

  // Refresh
  if (!tokens.refreshToken) throw new Error('No refresh token available');

  const fresh = await refreshAccessToken(tokens.refreshToken);
  tokens.accessToken = fresh.access_token;
  tokens.expiresAt = Date.now() + (fresh.expires_in || 3600) * 1000;
  if (fresh.refresh_token) tokens.refreshToken = fresh.refresh_token;

  return tokens.accessToken;
}

/**
 * Revoke all tokens for a user (disconnect).
 */
export function revokeUserTokens(userId) {
  storedTokens.delete(userId);
}

// ─── Calendar API helpers ───────────────────────────────────────────────────

async function calendarFetch(userId, path, options = {}) {
  const token = await getValidAccessToken(userId);
  const url = `${GOOGLE_CALENDAR_BASE}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (res.status === 401) {
    // Force refresh and retry once
    storedTokens.get(userId).expiresAt = 0;
    return calendarFetch(userId, path, options);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Calendar API error ${res.status}: ${body}`);
  }

  return res.json();
}

// ─── Event CRUD ─────────────────────────────────────────────────────────────

const EVENT_FIELDS = 'id,status,summary,description,location,start,end,hangoutLink,created,updated';

/**
 * List events from Google Calendar within a time range.
 */
export async function listEvents(userId, { timeMin, timeMax, calendarId = 'primary', maxResults = 100 } = {}) {
  const params = new URLSearchParams({
    timeMin: timeMin || new Date(Date.now() - 86400000).toISOString(),
    timeMax: timeMax || new Date(Date.now() + 7776000000).toISOString(), // ~90 days
    maxResults: String(maxResults),
    singleEvents: 'true',
    orderBy: 'startTime',
    fields: `items(${EVENT_FIELDS}),nextSyncToken`,
  });

  return calendarFetch(userId, `/calendars/${encodeURIComponent(calendarId)}/events?${params}`);
}

/**
 * Get a single event by Google event ID.
 */
export async function getEvent(userId, googleEventId, calendarId = 'primary') {
  return calendarFetch(userId, `/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}?fields=${EVENT_FIELDS}`);
}

/**
 * Create an event in Google Calendar.
 * Returns the Google Calendar event object with its id.
 */
export async function createEvent(userId, eventData, calendarId = 'primary') {
  const body = buildGoogleEvent(eventData);
  return calendarFetch(userId, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Update an existing event in Google Calendar.
 */
export async function updateEvent(userId, googleEventId, eventData, calendarId = 'primary') {
  const body = buildGoogleEvent(eventData);
  return calendarFetch(userId, `/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * Delete an event from Google Calendar.
 */
export async function deleteEvent(userId, googleEventId, calendarId = 'primary') {
  return calendarFetch(userId, `/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`, {
    method: 'DELETE',
  });
}

/**
 * Move an event to a new time slot (update start/end).
 */
export async function moveEvent(userId, googleEventId, newStart, newEnd, calendarId = 'primary') {
  return updateEvent(userId, googleEventId, { start: newStart, end: newEnd }, calendarId);
}

// ─── Watch / Push notifications ─────────────────────────────────────────────

/**
 * Register a webhook channel to receive push notifications for calendar changes.
 * Returns the channel object (including id and resourceId for renewal/stopping).
 */
export async function watchCalendar(userId, webhookUrl, calendarId = 'primary') {
  const body = {
    id: `crm_bewide_${userId}_${Date.now()}`,
    type: 'web_hook',
    address: webhookUrl,
    params: {
      ttl: '2592000', // 30 days in seconds
    },
  };

  return calendarFetch(userId, `/calendars/${encodeURIComponent(calendarId)}/events/watch`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Stop a webhook channel.
 */
export async function stopWatchChannel(userId, channelId, resourceId) {
  return calendarFetch(userId, '/channels/stop', {
    method: 'POST',
    body: JSON.stringify({ id: channelId, resourceId }),
  });
}

/**
 * Renew a watch channel (stop old, create new).
 */
export async function renewWatch(userId, oldChannelId, oldResourceId, webhookUrl, calendarId = 'primary') {
  await stopWatchChannel(userId, oldChannelId, oldResourceId).catch(() => {});
  return watchCalendar(userId, webhookUrl, calendarId);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildGoogleEvent(data) {
  const event = {
    summary: data.title,
    description: data.description || '',
    start: {
      dateTime: data.start,
      timeZone: data.timeZone || 'Europe/Paris',
    },
    end: {
      dateTime: data.end,
      timeZone: data.timeZone || 'Europe/Paris',
    },
  };

  if (data.location) event.location = data.location;
  if (data.reminders) event.reminders = data.reminders;
  if (data.attendees) event.attendees = data.attendees;
  if (data.source) event.source = data.source;

  return event;
}

/**
 * Map a Google Calendar event to our internal AgendaEvent format.
 */
export function mapGoogleEventToAgenda(googleEvent, userId) {
  const startStr = googleEvent.start?.dateTime || googleEvent.start?.date;
  const endStr = googleEvent.end?.dateTime || googleEvent.end?.date;
  const startMs = new Date(startStr).getTime();
  const endMs = new Date(endStr).getTime();

  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`,
    userId,
    title: googleEvent.summary || 'Sans titre',
    description: googleEvent.description || '',
    address: googleEvent.location || '',
    start: new Date(startStr).toISOString(),
    end: new Date(endStr).toISOString(),
    durationMinutes: Math.round((endMs - startMs) / 60000),
    bufferMinutes: 10,
    status: googleEvent.status === 'cancelled' ? 'cancelled' : 'scheduled',
    opportunityScore: 0,
    priority: 'normal',
    type: 'rdv',
    googleEventId: googleEvent.id,
    googleHangoutLink: googleEvent.hangoutLink || null,
    syncStatus: 'synced',
    lastSyncAt: new Date().toISOString(),
    createdAt: googleEvent.created || new Date().toISOString(),
    updatedAt: googleEvent.updated || new Date().toISOString(),
  };
}
