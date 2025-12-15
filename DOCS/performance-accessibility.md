# Performance & Accessibility

## Performance
- Use React Query caching with sensible `staleTime`/`gcTime`.
- Avoid expensive renders: memoize derived data, prefer list virtualization for long lists.
- Lazy-load heavy routes when needed; split code by page.
- Optimize images/assets; avoid blocking scripts.

## Accessibility
- Provide `aria-label`/`role` on interactive elements.
- Ensure focus states are visible; dialogs trap focus.
- Keyboard navigation: buttons and links reachable via tab; menus and dialogs close on Escape.
- Use semantic HTML (nav, main, header) for layout components.

## Quick Audit Steps
- Run `npm run test:ui` for state coverage.
- Manual tab-through for dialogs/forms.
- Lighthouse targets: Performance ≥ 90, Accessibility ≥ 90, Best Practices ≥ 90.
