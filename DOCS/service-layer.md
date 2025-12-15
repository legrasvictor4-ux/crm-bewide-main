# Service Layer Contracts

- **Location**: `src/services/*`
- **Principles**: No raw `fetch` in components; all network/storage calls go through services built on `apiClient` or Supabase client. Services return typed data and throw `ApiError` on failures.

## Clients Service (`services/clients.ts`)
- `fetchClients(params)`: filters, search, score threshold, optional sorting; retry with backoff.
- `createClient(payload)`: inserts client and returns created record.
- `updateClient(id, payload)`: updates client, returns updated record.
- `deleteClient(id)`: deletes client.

## Auth Service (`services/auth.ts`)
- `login(email, password)`: returns token + user.
- `logout()`: clears session server-side.

## Hooks (`hooks/use-clients.ts`)
- `useClients(params)`: React Query cached list with SWR semantics.
- `useCreateClient`, `useUpdateClient`, `useDeleteClient`: mutations that invalidate cache.

### Error Handling
- Services throw `ApiError` with `statusCode`, `code`, `message`, `details`.
- UI layers catch and map to toasts/banners; avoid leaking raw messages to users.

### Cancellation & Retry
- `withRetry` provides simple exponential backoff. Prefer passing `signal` into services when wiring abortable flows.
