import { z } from 'zod';

// ─── Geo ────────────────────────────────────────────────────────────────────
export const geoPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof geoPointSchema>;

// ─── Appointment (first-class entity) ───────────────────────────────────────
export const agendaEventStatusEnum = z.enum(['scheduled', 'completed', 'cancelled', 'rescheduled']);
export type AgendaEventStatus = z.infer<typeof agendaEventStatusEnum>;

export const agendaEventSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  clientId: z.string().uuid().optional().nullable(),
  title: z.string().min(1, 'Titre requis'),
  description: z.string().optional().default(''),
  address: z.string().optional().default(''),
  geo: geoPointSchema.optional().nullable(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  durationMinutes: z.number().int().positive(),
  bufferMinutes: z.number().int().min(0).max(120).default(10),
  status: agendaEventStatusEnum.default('scheduled'),
  opportunityScore: z.number().int().min(0).max(10).default(0),
  priority: z.enum(['low', 'normal', 'high', 'vip']).default('normal'),
  type: z.enum(['rdv', 'prospection', 'rappel', 'demo', 'livraison']).default('rdv'),
  googleEventId: z.string().optional().nullable(),
  googleHangoutLink: z.string().url().optional().nullable(),
  syncStatus: z.enum(['synced', 'pending', 'conflict', 'failed']).default('synced'),
  lastSyncAt: z.string().datetime().optional().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AgendaEvent = z.infer<typeof agendaEventSchema>;

export const createAgendaEventSchema = agendaEventSchema.omit({
  id: true,
  userId: true,
  status: true,
  syncStatus: true,
  lastSyncAt: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateAgendaEvent = z.infer<typeof createAgendaEventSchema>;

export const updateAgendaEventSchema = createAgendaEventSchema.partial().extend({
  status: agendaEventStatusEnum.optional(),
});
export type UpdateAgendaEvent = z.infer<typeof updateAgendaEventSchema>;

// ─── Proximity Suggestion ───────────────────────────────────────────────────
export const proximitySuggestionStatusEnum = z.enum(['pending', 'accepted', 'declined', 'dismissed']);
export type ProximitySuggestionStatus = z.infer<typeof proximitySuggestionStatusEnum>;

export const proximitySuggestionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  sourceEventId: z.string().uuid(),
  targetEventId: z.string().uuid(),
  sourceDate: z.string().datetime(),
  targetDate: z.string().datetime(),
  proposedDate: z.string().datetime(),
  distanceKm: z.number().nonnegative(),
  travelTimeMinutes: z.number().int().nonnegative(),
  relevanceScore: z.number().min(0).max(100),
  reason: z.string(),
  status: proximitySuggestionStatusEnum.default('pending'),
  cooldownUntil: z.string().datetime().optional().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ProximitySuggestion = z.infer<typeof proximitySuggestionSchema>;

// ─── Google Calendar Sync ───────────────────────────────────────────────────
export const syncActionEnum = z.enum(['created', 'updated', 'deleted', 'moved']);
export type SyncAction = z.infer<typeof syncActionEnum>;

export const syncDirectionEnum = z.enum(['crm_to_google', 'google_to_crm']);
export type SyncDirection = z.infer<typeof syncDirectionEnum>;

export const syncLogSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  googleEventId: z.string().optional().nullable(),
  action: syncActionEnum,
  direction: syncDirectionEnum,
  status: z.enum(['pending', 'success', 'failed']).default('pending'),
  errorMessage: z.string().optional().nullable(),
  retryCount: z.number().int().nonnegative().default(0),
  maxRetries: z.number().int().positive().default(3),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type SyncLog = z.infer<typeof syncLogSchema>;

// ─── User Settings ──────────────────────────────────────────────────────────
export const calendarSettingsSchema = z.object({
  userId: z.string().uuid(),
  provider: z.enum(['google', 'outlook', 'none']).default('none'),
  syncEnabled: z.boolean().default(false),
  googleCalendarId: z.string().optional().default('primary'),
  googleRefreshToken: z.string().optional().nullable(),
  googleAccessToken: z.string().optional().nullable(),
  tokenExpiresAt: z.string().datetime().optional().nullable(),
  planningMode: z.enum(['auto', 'manual']).default('manual'),
  maxDistanceKm: z.number().positive().default(30),
  minBreakMinutes: z.number().int().min(0).max(120).default(10),
  workingHoursStart: z.string().default('09:00'),
  workingHoursEnd: z.string().default('18:00'),
  nonWorkingDays: z.array(z.number().int().min(0).max(6)).default([0, 6]),
  proximityThresholdKm: z.number().positive().default(5),
  suggestionCooldownHours: z.number().int().positive().default(24),
  minRelevanceScore: z.number().min(0).max(100).default(30),
  updatedAt: z.string().datetime(),
});
export type CalendarSettings = z.infer<typeof calendarSettingsSchema>;

// ─── API responses ──────────────────────────────────────────────────────────
export const proximityCheckResultSchema = z.object({
  source: agendaEventSchema,
  target: agendaEventSchema,
  distanceKm: z.number(),
  travelTimeMinutes: z.number().int(),
  isProximate: z.boolean(),
  relevanceScore: z.number().min(0).max(100),
  reason: z.string(),
});
export type ProximityCheckResult = z.infer<typeof proximityCheckResultSchema>;

export const suggestionBatchSchema = z.object({
  suggestions: z.array(proximitySuggestionSchema),
  total: z.number().int().nonnegative(),
  cooldownActive: z.boolean(),
  nextCheckAt: z.string().datetime().nullable(),
});
export type SuggestionBatch = z.infer<typeof suggestionBatchSchema>;

export const syncStatusSchema = z.object({
  connected: z.boolean(),
  provider: z.enum(['google', 'outlook', 'none']),
  lastSyncAt: z.string().datetime().nullable(),
  pendingOperations: z.number().int().nonnegative(),
  failedOperations: z.number().int().nonnegative(),
});
export type SyncStatus = z.infer<typeof syncStatusSchema>;
