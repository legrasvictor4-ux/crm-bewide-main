# Release Checklist

- [ ] Lint clean (`npm run lint`)
- [ ] Tests green with coverage >= thresholds (`npm run test -- --coverage`, `npm run test:ui -- --coverage`, `npm run test:api`)
- [ ] TypeScript strict build passes
- [ ] UI smoke test: dashboard, prospection list, add client dialog, map view
- [ ] Error states verified (offline/API error toast, retry buttons)
- [ ] Accessibility quick pass (keyboard nav on dialogs/menus, aria labels on buttons)
- [ ] Build artifact inspected (`npm run build`)
- [ ] ENV/Secrets validated for target (Vercel tokens)
- [ ] Docs updated (README + DOCS)
