# Smart appointment scheduling (conflits + planification explicable)

## Data model
- `title` (string, required)
- `start`, `end` (ISO strings, required; `end` must be after `start`)
- `clientId` (string, optional)
- `address` (string, optional)
- `latitude`, `longitude` (numbers, optional but required for travel-time checks)
- `bufferMinutes` (number, default 10) – padding after travel estimate
- `opportunityScore` (0-10) – used by the planner

## Validation API
- Endpoint: `POST /api/appointments/validate`
- Body:
```json
{
  "appointment": { ...fields above... },
  "existingAppointments": [ { ...same shape... } ]
}
```
- Responses:
  - `200 OK { success: true, conflicts: Conflict[], travelCheck: number }`
  - `400` when the appointment payload fails schema validation.

`Conflict` shape: `{ code: "TIME_OVERLAP" | "TRAVEL_TOO_TIGHT" | "INVALID_TIME", message: string, blocking?: boolean }`

## Logic
- Time overlap: `(start < existing.end) && (end > existing.start)`
- Travel time: Haversine distance, average 35 km/h → minutes. If gap between appointments `< travelMinutes + buffer`, flag `TRAVEL_TOO_TIGHT` (non-blocking).
- Invalid ranges return `INVALID_TIME`.

## Daily planning (priority + proximity)
- Endpoint: `POST /api/appointments/plan`
- Body:
```json
{
  "date": "2025-01-15",
  "startLocation": { "latitude": 48.8566, "longitude": 2.3522, "label": "Bureau" },
  "appointments": [
    { "id": "a1", "title": "Client A", "start": "2025-01-15T09:00:00Z", "end": "2025-01-15T10:00:00Z", "latitude": 48.86, "longitude": 2.33, "opportunityScore": 9 }
  ]
}
```
- Logic: deterministic tri par `opportunityScore` décroissant puis proximité géographique à partir du point courant (startLocation puis chaînage). Renvoie `{ plan: [{ id, title, reason, distanceFromPreviousKm, estimatedTravelMinutes, opportunityScore }], warnings, requiresUserValidation }`.
- Objectif: ordre explicable, confirmé par l'utilisateur (aucune optimisation IA).

## Frontend usage
- Call `validateAppointment(appointment, existingAppointments)` from `src/services/scheduling.ts`.
- In `ContactForm`, blocking conflicts are shown inline (red alert) and prevent submission; warning conflicts show a confirmation banner with options to adjust or proceed.
- Call `planDay(date, appointments, startLocation?)` from `src/services/planning.ts` to retrieve a proposed order to display before execution (e.g., with `PlanPreview` component).
- For other flows, show conflicts inline (blocking vs non-blocking) and prompt user to reschedule or confirm override.

## Tests
- `tests/api/appointmentsConflict.test.ts` covers overlap, tight travel, and invalid payloads.
- `tests/api/appointmentsPlan.test.ts` covers deterministic ordering by priority then proximity.
