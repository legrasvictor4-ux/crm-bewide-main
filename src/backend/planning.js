import { z } from "zod";
import { appointmentRequestSchema, haversineDistanceKm, estimateTravelMinutes } from "./scheduling.js";

export const planAppointmentSchema = appointmentRequestSchema.extend({
  opportunityScore: z.number().int().min(0).max(10).optional(),
});

export const planRequestSchema = z.object({
  date: z.string().min(4, "Date requise"),
  startLocation: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      label: z.string().optional(),
    })
    .optional(),
  appointments: z.array(planAppointmentSchema).nonempty("Au moins un rendez-vous est requis"),
});

const sameDay = (dateA, targetDateIso) => {
  if (!dateA || !targetDateIso) return false;
  const a = new Date(dateA);
  if (Number.isNaN(a.getTime())) return false;
  return a.toISOString().slice(0, 10) === targetDateIso.slice(0, 10);
};

const distanceKm = (from, to) => haversineDistanceKm(from, to);

/**
 * Deterministic daily plan based on (1) opportunity score then (2) geographic proximity.
 * Returns an ordered list with human-readable reasons to keep it explainable for the user.
 */
export function planDay(rawAppointments = [], { date, startLocation } = {}) {
  if (!date) {
    return { success: false, error: { code: "MISSING_DATE", message: "Date requise" } };
  }
  const day = new Date(date).toISOString().slice(0, 10);
  const appointments = rawAppointments.filter((apt) => sameDay(apt.start, day));
  if (appointments.length === 0) {
    return {
      success: true,
      plan: [],
      warnings: ["Aucun rendez-vous pour cette date"],
      requiresUserValidation: true,
    };
  }

  const unscheduled = [...appointments];
  const plan = [];
  let current = startLocation || null;
  const warnings = [];

  while (unscheduled.length > 0) {
    const sorted = [...unscheduled].sort((a, b) => {
      const scoreA = a.opportunityScore ?? 0;
      const scoreB = b.opportunityScore ?? 0;
      if (scoreA !== scoreB) return scoreB - scoreA;
      const distA =
        current && a.latitude != null && a.longitude != null ? distanceKm(current, a) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
      const distB =
        current && b.latitude != null && b.longitude != null ? distanceKm(current, b) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
      if (distA !== distB) return distA - distB;
      return (a.start || "").localeCompare(b.start || "");
    });

    const next = sorted[0];
    const index = unscheduled.findIndex((u) => u.id === next.id);
    if (index >= 0) unscheduled.splice(index, 1);

    const km =
      current && next.latitude != null && next.longitude != null ? distanceKm(current, next) : null;
    const travelMinutes =
      km != null ? estimateTravelMinutes(current, next) : null;

    if (km == null) {
      warnings.push(`Position manquante pour ${next.title || next.id || "un rendez-vous"} : tri par priorité uniquement.`);
    }

    plan.push({
      id: next.id,
      title: next.title,
      start: next.start,
      end: next.end,
      opportunityScore: next.opportunityScore ?? 0,
      distanceFromPreviousKm: km,
      estimatedTravelMinutes: travelMinutes,
      reason:
        km != null
          ? `Score ${next.opportunityScore ?? 0} et proximité (${km.toFixed(1)} km${startLocation?.label ? ` depuis ${startLocation.label}` : ""})`
          : `Score ${next.opportunityScore ?? 0} (coordonnées manquantes)`,
    });

    if (next.latitude != null && next.longitude != null) {
      current = { latitude: next.latitude, longitude: next.longitude };
    }
  }

  return {
    success: true,
    plan,
    warnings,
    requiresUserValidation: true,
  };
}
