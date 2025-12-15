# CI/CD

- Workflow: `.github/workflows/main.yml`
  - Lint (ESLint)
  - Unit tests (`npm run test -- --coverage`)
  - UI tests (`npm run test:ui -- --coverage`)
  - API tests (`npm run test:api`)
  - Build (gated on tests)
  - Deploy (Vercel on `main`)
  - PR comment summarizing statuses
- Coverage thresholds enforced in `vitest.config.ts` (80/80/70/80).
- Artifacts: coverage (unit/ui) and `dist` uploaded for inspection.
- Secrets for deploy: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
