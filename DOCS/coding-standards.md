# Coding Standards

- **TypeScript**: `strict` enabled. No `any` or implicit `undefined`; prefer `unknown` + narrowing. Enable `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`.
- **Imports**: Use path alias `@/` for src. No deep relative imports (`../../..`). Provide barrel exports per feature folder when stable.
- **Components**: Keep UI-only components in `components/ui`; feature/layout shells in `components/layout|sections`. Move business logic into hooks/services.
- **State**: Prefer React Query/SWR for server state; context or Zustand for global client state; avoid prop drilling.
- **Styling**: Tailwind + shadcn primitives. Keep consistent spacing/typography; no inline magic numbers.
- **Testing**: Vitest + RTL for components; supertest for API. Every feature needs loading/empty/error/success test coverage.
- **Error Handling**: Throw typed errors from services; surface user-friendly toasts; log with context.
- **Git/CI**: Lint and tests must pass before merge; CI deploys only after green builds on `main`.
