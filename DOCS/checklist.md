# Dev & QA Checklist

- UI structure/layout clear; reusable components extracted (cards, sections, panels, nav).
- Imports use `@/` alias; barrels provided where stable; naming consistent.
- TypeScript strict enabled; no implicit `any`; shared models in `src/types`.
- Services wrap all API calls; no raw `fetch` in components; queries cached with React Query/SWR.
- Error handling standardized: typed errors, user-facing toasts/panels, backend structured responses, `/health` endpoint.
- Tests: lint + unit + UI integration + API; coverage generated; critical flows (login, client add, import, filters) covered.
- CI/CD: lint before tests, artifacts cached, coverage uploaded, deploy gated on green build, PR summary comment.
- Performance/accessibility: large lists virtualized where needed; images/assets optimized; ARIA/keyboard support; Lighthouse targets >=90.
- Docs updated: README, coding standards, component conventions, state mgmt, API contracts, error handling.
