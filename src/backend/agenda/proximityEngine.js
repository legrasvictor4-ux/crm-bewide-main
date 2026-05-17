import { z } from 'zod';

const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;

/**
 * Haversine distance between two geo points.
 * Returns distance in km, or null if coordinates are invalid.
 */
export function haversineKm(a, b) {
  if (!a || !b || a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) {
    return null;
  }
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Estimate travel time in minutes given distance and average speed.
 */
export function estimateTravelMinutes(distanceKm, averageKmh = 40) {
  if (distanceKm == null) return null;
  return Math.round((distanceKm / averageKmh) * 60);
}

// ─── Suggestion input schema ────────────────────────────────────────────────
export const proximityCheckSchema = z.object({
  appointments: z.array(z.object({
    id: z.string(),
    title: z.string(),
    start: z.string(),
    end: z.string(),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
    address: z.string().optional().default(''),
    opportunityScore: z.number().int().min(0).max(10).optional().default(0),
    priority: z.enum(['low', 'normal', 'high', 'vip']).optional().default('normal'),
    clientId: z.string().optional().nullable(),
  })).min(2, 'Au moins 2 rendez-vous requis pour analyser la proximité'),
  thresholdKm: z.number().positive().default(5),
  minRelevanceScore: z.number().min(0).max(100).default(30),
});

/**
 * Compute a relevance score (0-100) for moving target to source's day.
 * Higher = more worthwhile to suggest.
 */
function computeRelevanceScore(source, target, distanceKm) {
  let score = 0;

  // Distance bonus: closer = more relevant
  if (distanceKm <= 1) score += 40;
  else if (distanceKm <= 3) score += 30;
  else if (distanceKm <= 5) score += 20;
  else score += 10;

  // Opportunity score contribution
  const oppScore = (source.opportunityScore ?? 0) + (target.opportunityScore ?? 0);
  score += oppScore * 3;

  // Inverse VIP penalty: don't move VIPs lightly
  if (source.priority === 'vip') score -= 15;
  if (target.priority === 'vip') score -= 15;

  // Same-day boost
  const sourceDay = source.start?.slice(0, 10);
  const targetDay = target.start?.slice(0, 10);
  if (sourceDay === targetDay) score += 10; // already same day, less urgent

  // Normalize to 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Generate a concise, human-readable reason (max 2 lines).
 */
function generateReason(source, target, distanceKm, travelMin) {
  const sourceName = source.title || 'Rendez-vous';
  const targetName = target.title || 'un autre rendez-vous';
  const distStr = distanceKm < 1 ? 'à moins de 1 km' : `à ${distanceKm.toFixed(1)} km`;

  return [
    `${sourceName} et ${targetName} sont ${distStr} l'un de l'autre`,
    travelMin != null
      ? `Déplacer permettrait d'économiser ${travelMin} min de trajet.`
      : 'Regrouper ces rendez-vous optimiserait vos déplacements.',
  ].join(' ');
}

/**
 * Detect proximate appointment pairs within a set of future appointments.
 * Returns scored suggestions sorted by relevance (highest first).
 */
export function detectProximateAppointments(rawAppointments, options = {}) {
  const parsed = proximityCheckSchema.safeParse({
    appointments: rawAppointments,
    ...options,
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join(', ') };
  }

  const { appointments, thresholdKm, minRelevanceScore } = parsed.data;
  const results = [];

  for (let i = 0; i < appointments.length; i++) {
    for (let j = i + 1; j < appointments.length; j++) {
      const a = appointments[i];
      const b = appointments[j];

      const distanceKm = haversineKm(
        { latitude: a.latitude, longitude: a.longitude },
        { latitude: b.latitude, longitude: b.longitude },
      );

      if (distanceKm == null || distanceKm > thresholdKm) continue;

      const travelMin = estimateTravelMinutes(distanceKm);

      const scoreA = computeRelevanceScore(b, a, distanceKm);
      const scoreB = computeRelevanceScore(a, b, distanceKm);

      // Only suggest if at least one direction meets the relevance threshold
      if (scoreA < minRelevanceScore && scoreB < minRelevanceScore) continue;

      // Prefer moving later appointment to earlier day
      const aDay = a.start?.slice(0, 10);
      const bDay = b.start?.slice(0, 10);

      if (aDay < bDay && scoreA >= minRelevanceScore) {
        results.push({
          sourceEventId: a.id,
          targetEventId: b.id,
          sourceDate: a.start,
          targetDate: b.start,
          proposedDate: a.start,
          distanceKm: Math.round(distanceKm * 100) / 100,
          travelTimeMinutes: travelMin,
          relevanceScore: Math.round(scoreA),
          reason: generateReason(a, b, distanceKm, travelMin),
        });
      }

      if (bDay < aDay && scoreB >= minRelevanceScore) {
        results.push({
          sourceEventId: b.id,
          targetEventId: a.id,
          sourceDate: b.start,
          targetDate: a.start,
          proposedDate: b.start,
          distanceKm: Math.round(distanceKm * 100) / 100,
          travelTimeMinutes: travelMin,
          relevanceScore: Math.round(scoreB),
          reason: generateReason(b, a, distanceKm, travelMin),
        });
      }

      // Same day: still suggest if very close (< 1 km) and high score
      if (aDay === bDay && distanceKm < 1 && (scoreA >= minRelevanceScore || scoreB >= minRelevanceScore)) {
        const best = scoreA >= scoreB
          ? { sourceId: a.id, targetId: b.id, srcDate: a.start, tgtDate: b.start, score: scoreA }
          : { sourceId: b.id, targetId: a.id, srcDate: b.start, tgtDate: a.start, score: scoreB };

        results.push({
          sourceEventId: best.sourceId,
          targetEventId: best.targetId,
          sourceDate: best.srcDate,
          targetDate: best.tgtDate,
          proposedDate: best.srcDate,
          distanceKm: Math.round(distanceKm * 100) / 100,
          travelTimeMinutes: travelMin,
          relevanceScore: Math.round(best.score),
          reason: generateReason(
            appointments.find((x) => x.id === best.sourceId),
            appointments.find((x) => x.id === best.targetId),
            distanceKm,
            travelMin,
          ),
        });
      }
    }
  }

  // Sort by relevance score descending, limit to top 5
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const top = results.slice(0, 5);

  return {
    success: true,
    suggestions: top,
    totalFound: results.length,
  };
}
