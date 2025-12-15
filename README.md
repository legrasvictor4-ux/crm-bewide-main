# CRM Bewide

[![CI/CD](https://github.com/OWNER/REPO/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/OWNER/REPO/actions/workflows/main.yml)
[![Coverage](https://img.shields.io/badge/Coverage-80%25-green)](https://github.com/OWNER/REPO/actions/workflows/main.yml)
[![E2E](https://img.shields.io/badge/E2E-Playwright-purple)](https://github.com/OWNER/REPO/actions/workflows/main.yml)
[![Security](https://img.shields.io/badge/Security-Checks-blue)](https://github.com/OWNER/REPO/actions/workflows/main.yml)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel-black)](https://vercel.com/)

## Overview
CRM Bewide is a Vite + React + TypeScript app with shadcn-ui/Tailwind for UI and a lightweight Node API. This repo is organized for strict typing, modular services, and CI/CD-ready deployments.

## Architecture
- `src/components/ui|layout|sections`: Reusable UI primitives and page layout shells.
- `src/pages`: Route-level pages.
- `src/context`: Shared app contexts (auth, theme, global state).
- `src/hooks`: Reusable hooks (device, toast, data helpers).
- `src/integrations`: External service integrations (e.g., Supabase).
- `src/lib`: Utilities/helpers.
- `src/types`: Shared type declarations and models.
- `server/`: Backend/API utilities.
- `tests/`: API tests (supertest) and UI integration (vitest/jsdom).

## Getting Started
```sh
npm ci
npm run dev
```
Environment: copy `.env.example` to `.env` and fill required keys. For Supabase, see `supabase/` folder.

## Scripts
- `npm run dev`: Start Vite + API concurrently.
- `npm run lint`: ESLint static analysis.
- `npm run test`: Unit tests (Vitest).
- `npm run test:ui`: UI integration tests (Vitest + jsdom).
- `npm run test:api`: API tests (supertest).
- `npm run build`: Production build.
- `npm run test:e2e`: Playwright end-to-end tests (build + preview server).

## Testing & Coverage
```sh
npm run lint
npm run test -- --coverage
npm run test:ui -- --coverage
npm run test:api
```
Artifacts: coverage output is uploaded by CI on pull requests.

## CI/CD
GitHub Actions pipeline (`.github/workflows/main.yml`): lint ? unit tests ? UI tests ? build ? deploy (main branch) with PR summary comments. Node 20 with npm caching and build artifacts retained.

## Deployment
Vercel (default): provide secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. CI deploys `main` on success. For Netlify, swap the deploy step to `netlify/actions/cli@v2` with `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`.

## Documentation
See `DOCS/` for coding standards, components, state management, API contracts, error handling, and QA checklist.
