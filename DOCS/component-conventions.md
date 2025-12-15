# Component Conventions

- **Structure**: `components/ui` for primitives; `components/layout` for app shells/navigation; `components/sections` for page sections; `components/common` for shared feature widgets.
- **Props**: Define `Props` interfaces; keep optional fields explicit. Use descriptive prop names (`onSubmit`, `isLoading`, `variant`).
- **Patterns**: Extract repeatable patterns into `<Card>`, `<Section>`, `<Panel>`, `<StatBlock>`. Use composition over prop drilling.
- **Accessibility**: Add `aria-*` where appropriate, focus management for dialogs, keyboard navigation on lists/menus.
- **Responsiveness**: Use flex/grid with Tailwind breakpoints (`sm`, `md`, `lg`, `xl`). Avoid hardcoded px unless necessary.
- **Error/Empty States**: Each data component renders loading, empty, error, and success views. Use shadcn `<Skeleton>` for loading.
