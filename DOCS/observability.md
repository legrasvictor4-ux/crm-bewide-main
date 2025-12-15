# Observability

## Frontend
- Error boundaries wrap routes; toasts surface user-facing errors.
- Use `console.error` only in development; prefer structured logs via a small logger wrapper.
- Capture query/mutation failures via React Query `QueryCache`/`MutationCache`.

## Backend
- Standard error shape: `{ status, code, message, details? }`.
- Add request-scoped logging with level + timestamp; emit errors for 4xx/5xx.
- Health endpoint should report uptime and version; status endpoint for readiness.

## Monitoring Hooks
- Track API latency and error counts for critical paths (clients CRUD, import, lead score).
- Emit metrics to your preferred APM when available; leave stubs/hooks ready.
