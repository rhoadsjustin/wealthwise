Working in budget-app — Conventions, Structure, and UI Guidelines

- Overview
  - Mobile-first Expo app using Expo Router, NativeWind (Tailwind for RN), and local SQLite via `expo-sqlite`.
  - Data flow: UI components → `context/DataContext` (business logic) → `lib/local-storage.ts` (SQLite wrapper).
  - Do not access SQLite directly from UI; always go through DataContext.
  - Prefer route-based modals with Expo Router for native UX (see `docs/MODAL_USAGE.md`).

- Project Structure
  - `app/`: Expo Router routes.
    - Tabs under `app/(tabs)/*`. Modal pages at `app/modal.tsx`, `app/transactions-modal.tsx`.
    - Add new modal screens as top-level files in `app/` and set options in `app/_layout.tsx`.
  - `components/`: Reusable, typed TSX UI primitives.
    - Follow variant/size patterns (e.g., `Button`, `Input`, `Select`, `Dialog`, `Card`).
    - Use `className` with semantic Tailwind tokens defined in `tailwind.config.js`.
  - `context/`: App-wide state and data access.
    - `DataContext.tsx` is the source of truth for CRUD + derived summaries.
    - Use `useData()`, and convenience helpers like `useTransactions()`/`useCategories()` directly from DataContext.
  - `lib/`:
    - `theme.ts`: theme constants/helpers. Prefer Tailwind classes; use theme helpers for inline styles.
    - `local-storage.ts`: SQLite wrapper (only used by DataContext).
    - `schema/schema.ts`: canonical data types; update here when adding entities.
    - `api.ts`: legacy bridge delegating to DataContext (ensured via `setDataContext`).
  - `store/`: Use for ephemeral UI state only (e.g., toggles). Not for persisted business data.

- Styling and Theming
  - Use NativeWind classes with semantic tokens; avoid hard-coded colors.
    - Backgrounds: `bg-background-primary`, `bg-app-surface`, etc.
    - Text: `text-foreground-primary`, `text-app-text-secondary`, etc.
    - Borders: `border-border-default`, `border-app-border`.
    - Status: `success-*`, `warning-*`, `error-*`, `info-*`.
  - Spacing and radius should follow Tailwind scale (`p-4`, `gap-2`, `rounded-xl`, etc.). Avoid arbitrary values.
  - For non-class styling, pull from `lib/theme.ts` helpers.

- Components Conventions
  - Props patterns:
    - `variant`: visual style — `default|secondary|outline|ghost|success|warning|error`.
    - `size`: `sm|md|lg`.
    - Accept `className` and `style`; prefer classes for layout/visuals.
  - Accessibility:
    - Provide visible labels (`Label`) and `accessibilityLabel` where appropriate.
    - Maintain adequate touch targets and contrast.
  - Forms:
    - Use `react-hook-form` patterns as in `components/AddTransactionModal.tsx`.
    - Validate before mutate; show toasts on error.

- Data and Context
  - Call getters/mutations from `DataContext` for all data operations.
  - Honor `DataContext.isInitialized` before fetching; many screens read via an `AppDataProvider` in `app/_layout.tsx`.
  - Components that need to refresh after mutations can rely on `DataContext.dataVersion` or re-call getters as needed.
  - Keep UI optimistic where appropriate by updating local component state first, then persisting via DataContext.

- Navigation and Modals
  - Prefer Expo Router route-based modals for native behavior.
  - Trigger via `useRouter().push('/modal')` or `Link`.
  - For in-place pickers/dropdowns inside modals, use the native `Select` component (no nested modals).

- Types and Schema
  - Add/modify entity types in `lib/schema/schema.ts` first.
  - Reflect changes in `context/DataContext.tsx` and surface through `lib/hooks.ts`.
  - Keep TypeScript strict; avoid `any`. Reuse DataContext and schema types.

- Linting and Formatting
  - Run `npm run format` before commits (ESLint fix + Prettier + Tailwind plugin).
  - Follow ESLint Expo config; only disable rules locally when justified.

- Scripts and Local Dev
  - `npm run start` — Expo dev client.
  - `npm run ios` / `npm run android` — run on devices/simulators.
  - `npm run web` — web preview.
  - `npm run lint` / `npm run format` — validate and format.

- When Adding Features
  - UI: extend design-system components; avoid ad-hoc styles.
  - Data: add methods to `DataContext` and, if helpful, add small convenience hooks in the same file.
  - Docs: update `docs/` or component JSDoc for new primitives/patterns.
  - Tests: no formal suite; verify via simulator with attention to regressions.

- Ready-to-Build UI Improvements
  - Transactions
    - Swipe actions on rows for quick categorize/edit/delete with haptics.
    - Pull-to-refresh by re-calling DataContext getters and/or bumping local state.
  - Categories/Budget
    - Inline edit budgets in Budget tab with optimistic updates.
    - Progress rings per category with semantic status colors.
  - Inputs & Selects
    - Currency masking for Amount; keyboard accessory actions (Done/Next).
    - Search/filter in category selection.
  - States & Feedback
    - Consistent empty and error states with clear actions.
    - Non-blocking error banners for network/storage failures.
  - Animations
    - Use existing Tailwind keyframes; apply soft transitions on section updates.
  - Accessibility
    - Audit `accessibilityLabel` coverage and touch sizes across components.

- PR Checklist
  - [ ] Uses semantic Tailwind classes and component variants.
  - [ ] Data operations go through `DataContext` only (no direct SQLite).
  - [ ] Screens respect `DataContext.isInitialized` and handle empty/loading states.
  - [ ] Types updated in `lib/schema/schema.ts` and reflected in DataContext.
  - [ ] Linted and formatted via `npm run format`.
  - [ ] Screens/components accessible and responsive.
