import { ApiError } from "@/types/api";

export type PlanAppointment = {
  id?: string;
  title: string;
  start: string;
  end: string;
  latitude?: number;
  longitude?: number;
  opportunityScore?: number;
};

export type StartLocation = {
  latitude: number;
  longitude: number;
  label?: string;
};

export type PlanResponse = {
  success: boolean;
  plan: Array<PlanAppointment & { distanceFromPreviousKm?: number; estimatedTravelMinutes?: number; reason: string }>;
  warnings?: string[];
  requiresUserValidation: boolean;
};

export async function planDay(
  date: string,
  appointments: PlanAppointment[],
  startLocation?: StartLocation
): Promise<PlanResponse> {
  const res = await fetch("/api/appointments/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, appointments, startLocation }),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError(payload.error?.message || "Planification indisponible", res.status, payload.error?.code);
  }

  return (await res.json()) as PlanResponse;
}
