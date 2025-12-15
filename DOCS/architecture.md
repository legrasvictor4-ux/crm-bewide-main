# Architecture Overview

- **UI Layer**: React + shadcn primitives under `src/components/ui` with layout shells in `src/components/layout`.
- **Feature Hooks**: `src/hooks` exposes typed hooks backed by React Query for data fetching and caching.
- **Services**: All network/storage operations in `src/services/*` using `apiClient` or Supabase client; typed models live in `src/types`.
- **State**: React Query manages server state; contexts handle auth and shared client state.
- **Routing**: React Router under `src/pages/*`.
- **Testing**: Vitest (unit/UI), supertest (API), Playwright/Cypress recommended for E2E.
- **CI/CD**: GitHub Actions runs lint → unit/ui/api tests with coverage → build → deploy.
