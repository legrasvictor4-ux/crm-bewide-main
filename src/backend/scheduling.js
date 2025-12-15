import { z } from "zod";

// Appointment model for conflict checks
export const appointmentRequestSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Titre requis"),
  clientId: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  start: z.string().min(1, "Date de début requise"),
  end: z.string().min(1, "Date de fin requise"),
  bufferMinutes: z.number().int().min(0).max(120).default(10),
});

const EARTH_RADIUS_KM = 6371;

const toRadians = (deg) => (deg * Math.PI) / 180;

export function haversineDistanceKm(a, b) {
  if (!a || !b || a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) {
    return null;
  }
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function estimateTravelMinutes(from, to, averageKmh = 35) {
  const distance = haversineDistanceKm(from, to);
  if (distance == null) return null;
  return Math.round((distance / averageKmh) * 60);
}

export function detectConflicts(candidate, existingAppointments = []) {
  const conflicts = [];
  const start = new Date(candidate.start).getTime();
  const end = new Date(candidate.end).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return [{ code: "INVALID_TIME", message: "Plage horaire invalide" }];
  }

  existingAppointments.forEach((apt) => {
    const aptStart = new Date(apt.start).getTime();
    const aptEnd = new Date(apt.end).getTime();
    if (Number.isNaN(aptStart) || Number.isNaN(aptEnd)) {
      return;
    }
    // Time overlap
    if (start < aptEnd && end > aptStart) {
      conflicts.push({
        code: "TIME_OVERLAP",
        message: `Chevauchement avec ${apt.title || apt.id || "un rendez-vous"}`,
        blocking: true,
      });
      return;
    }

    // Travel feasibility check
    const travelMinutes = estimateTravelMinutes(
      { latitude: apt.latitude, longitude: apt.longitude },
      { latitude: candidate.latitude, longitude: candidate.longitude }
    );
    if (travelMinutes != null) {
      const gap = (aptStart > end ? aptStart - end : start - aptEnd) / (1000 * 60); // minutes gap
      const needed = travelMinutes + (candidate.bufferMinutes || 10);
      if (gap < needed) {
        conflicts.push({
          code: "TRAVEL_TOO_TIGHT",
          message: `Temps de trajet insuffisant (${travelMinutes} min) avant ${apt.title || apt.id || "rdv"}`,
          blocking: false,
        });
      }
    }
  });

  return conflicts;
}
