import { ApiError } from "@/types/api";

export type AppointmentPayload = {
  id?: string;
  title: string;
  clientId?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  start: string;
  end: string;
  bufferMinutes?: number;
};

export type AppointmentValidationResponse = {
  success: boolean;
  conflicts: { code: string; message: string; blocking?: boolean }[];
  travelCheck: number;
};

export async function validateAppointment(appointment: AppointmentPayload, existingAppointments: AppointmentPayload[] = []) {
  const res = await fetch("/api/appointments/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appointment, existingAppointments }),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError(payload.error?.message || "Validation échouée", res.status, payload.error?.code);
  }

  return (await res.json()) as AppointmentValidationResponse;
}
