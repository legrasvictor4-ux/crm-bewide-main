# State Management & Data Fetching

- **Server State**: Use React Query (or SWR) for API data: caching, background revalidation, retries, and error boundaries.
- **Client State**: Keep in context or a small store (e.g., Zustand) for auth/session, filters, layout prefs. Avoid drilling props.
- **Services Layer**: Place API clients under `src/services/*` with typed request/response models. No direct `fetch` in components.
- **Query Keys**: Namespace keys (e.g., `['clients', clientId]`). Use invalidate/refetch on mutations.
- **Error Handling**: Throw typed errors from services; wrap UI with error boundaries; display toasts/modals.
- **Side Effects**: Keep side effects inside hooks (`useXxx`) or React Query mutation callbacks, not in render paths.
