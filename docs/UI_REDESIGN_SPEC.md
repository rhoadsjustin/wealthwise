# Budget App UI Redesign Spec

## Goal

Redesign `budget-app` into a more premium, dark-first mobile experience inspired by the finance UI patterns visible in the reference tweet/video:

- [Reference tweet](https://x.com/markproduct/status/2058058658282680749)
- [Public mirror payload](https://api.fxtwitter.com/markproduct/status/2058058658282680749)

This is not a generic reskin. The redesign should:

- simplify top-level navigation
- increase visual hierarchy
- make key numbers feel more immediate
- group related money workflows into fewer, clearer modes
- preserve the current data architecture (`UI -> DataContext -> local-storage`)

## What The Reference Actually Suggests

The relevant frames are the dark finance screens, not the health or desktop UI. The strongest patterns:

- near-black background with restrained glow accents
- one hero metric per screen
- compact stacked cards instead of large airy white surfaces
- pill controls for mode and timeframe
- bottom navigation presented as a floating mode switch
- charts used as visual anchors, not secondary filler
- alerts/tasks surfaced as high-value modules near the top

## Current App Constraints

Current primary tab surfaces:

- [Dashboard](/Users/rhoads/budget-app/app/(tabs)/index.tsx)
- [Bills](/Users/rhoads/budget-app/app/(tabs)/bills.tsx)
- [Debts](/Users/rhoads/budget-app/app/(tabs)/debts.tsx)
- [Savings](/Users/rhoads/budget-app/app/(tabs)/savings.tsx)
- [Insights](/Users/rhoads/budget-app/app/(tabs)/insights.tsx)
- Native tabs layout: [app/(tabs)/_layout.tsx](/Users/rhoads/budget-app/app/(tabs)/_layout.tsx)

Supporting system constraints:

- semantic tokens already live in [tailwind.config.js](/Users/rhoads/budget-app/tailwind.config.js)
- shared card primitive exists in [components/Card.tsx](/Users/rhoads/budget-app/components/Card.tsx)
- theme constants exist in [lib/theme.ts](/Users/rhoads/budget-app/lib/theme.ts)
- all business data must continue flowing through [context/DataContext.tsx](/Users/rhoads/budget-app/context/DataContext.tsx)

## IA Rewrite

### New Primary Modes

Replace the current 5-tab structure with 4 tabs:

1. `Home`
2. `Activity`
3. `Plan`
4. `Insights`

### Rationale

- `Bills`, `Debts`, and `Savings` are separate today, but conceptually they are all planned commitments.
- The reference UI feels mode-driven, not entity-driven.
- `Reports` content should not remain visually disconnected from `Insights`; premium analytics and AI guidance should live together.

### Route Mapping

- `app/(tabs)/index.tsx` -> `Home`
- `app/transactions-modal.tsx` plus transaction search/filter patterns -> `Activity`
- `app/(tabs)/bills.tsx`, `app/(tabs)/debts.tsx`, `app/(tabs)/savings.tsx` -> merged `Plan`
- `app/(tabs)/insights.tsx` absorbs premium reporting entry points

### Recommended Tab Labels And Icons

- `Home`: `house.fill`
- `Activity`: `list.bullet.rectangle.fill`
- `Plan`: `target`
- `Insights`: `sparkles` or `chart.line.uptrend.xyaxis`

## Visual Direction

### Theme

Adopt a dark-first visual system:

- app background: near-black, not flat pure black
- surfaces: charcoal layers with subtle elevation shifts
- borders: faint cool-gray separators
- chart accents: neon green, magenta, amber, electric blue used sparingly
- white used for hero figures and active controls only

### Tone

- premium and deliberate
- denser information layout than current white-card dashboard
- less “budget spreadsheet”
- more “command center for personal money”

### Motion

- soft tab transitions
- chart/value reveal on first load
- pill selector transitions
- no decorative motion loops

## Token Changes

Do not hard-code redesign colors directly in screens. Extend semantic tokens first.

### Add Semantic Dark Tokens

In [tailwind.config.js](/Users/rhoads/budget-app/tailwind.config.js) and [lib/theme.ts](/Users/rhoads/budget-app/lib/theme.ts), add or normalize:

- `bg-app-canvas`
- `bg-app-surface-1`
- `bg-app-surface-2`
- `bg-app-surface-3`
- `border-app-contrast`
- `text-app-strong`
- `text-app-soft`
- `text-app-faint`
- `accent-income`
- `accent-expense`
- `accent-debt`
- `accent-savings`
- `accent-insight`
- `accent-neutral`

### Color Intent

- `accent-income`: vivid green
- `accent-expense`: pink-red
- `accent-debt`: amber or orange
- `accent-savings`: cyan or electric blue
- `accent-insight`: violet only if restrained

Avoid reusing current bright sky blue as the default answer for everything.

## Component System Changes

### New Shared Primitives

Add or refactor shared primitives before screen work:

1. `HeroMetricCard`
2. `PillSegmentedControl`
3. `FloatingTabShell` or tab styling layer for native tabs
4. `MetricChip`
5. `AlertTaskCard`
6. `MiniTrendChartCard`
7. `SectionHeaderRow`
8. `CommitmentCard`
9. `TransactionRowDense`
10. `InsightCalloutCard`

### Existing Primitive Refactors

#### `Card`

Refactor [components/Card.tsx](/Users/rhoads/budget-app/components/Card.tsx) to support dark variants:

- `default`
- `elevated`
- `glass-dark`
- `inset`
- `hero`

The current card styles are too white, too rounded, and too uniform for the target direction.

#### `Button`

Add variants suited to dark UI:

- `primary-solid`
- `secondary-muted`
- `pill`
- `icon-dark`

#### `FAB`

Revisit the current FAB so it fits the floating bottom language. It may remain, but should visually coordinate with the tab shell.

## Screen Specs

## 1. Home

### Purpose

Give the user an immediate answer to:

- how am I doing this month
- what needs attention next
- where is money moving

### Layout

Top to bottom:

1. Header row
2. Month pill
3. Hero financial health card
4. Quick actions row
5. Expense pulse chart
6. Alerts/tasks section
7. Recent activity preview

### Header Row

- left: profile/avatar trigger
- center: month selector pill (`This month`)
- right: notifications/profile utility

Keep this minimal. Remove large textual headers from the top.

### Hero Card

Primary content:

- `Financial Health Score`
- large numeric score
- status chip: `Excellent`, `Stable`, `Watch`, `Critical`
- small row of summary metrics:
  - income
  - expenses
  - debt
  - savings progress

Secondary content:

- compact line or bar trend behind/below score
- “updated X days ago” copy in subdued text

Use `summary`, `incomeBaseline`, `totalExpenses`, savings totals, and debt totals from DataContext-derived state.

### Quick Actions

Four icon pills:

- Add expense
- Add income
- Transfer to savings
- Review plan

These should be compact and symmetrical, similar to wallet/finance app action pads.

### Expense Pulse Chart

A mid-height card with:

- `Total expenses`
- monthly total
- day/week/month filter pills
- colored grouped bars or compact trend graph
- 3 to 4 colored category legends max

This replaces today’s oversized pie-first treatment on `Dashboard`.

### Alerts / Tasks

A stacked set of small high-signal cards:

- `Goal alert`: “Add $500 to reach savings target”
- `Bill due`: “Internet bill due in 2 days”
- `Debt task`: “Pay $200 extra to reduce interest”

Each card should have:

- colored label
- one sentence
- optional progress chip

### Recent Activity

Show only the latest 4 to 5 items with denser rows.

Each row:

- category icon
- merchant/description
- category/date
- amount
- optional sparkline badge for category trend later

## 2. Activity

### Purpose

Make transactions feel like a first-class product surface instead of a modal-only utility.

### Layout

1. Search field
2. Filter pill row
3. Summary chips
4. Transaction list

### Filters

- `All`
- `Expenses`
- `Income`
- `Uncategorized`
- `This month`

Optional secondary category filter can follow later.

### Summary Chips

Above the list:

- total spent
- transaction count
- uncategorized count

### Transaction List

Use denser, darker rows than current `Latest transactions`.

Required row actions:

- tap -> edit/details
- swipe left/right patterns already exist and should stay
- keep “Auto-categorize” accessible from this surface, not hidden

### Search UX

The reference uses a top search field as part of the primary frame. Bring transaction search forward visually.

## 3. Plan

### Purpose

Unify all recurring and goal-oriented money commitments in one mode.

This is the biggest IA shift in the redesign.

### Internal Sections

Within one scroll surface:

1. Overview strip
2. Bills
3. Debts
4. Savings goals

### Overview Strip

Three compact summary cards:

- upcoming bills total
- outstanding debt
- savings progress

### Bills Section

Keep existing bill data model, but visually convert to compact commitment cards:

- name
- due date
- amount
- paid/unpaid state
- quick pay action

### Debts Section

Each card should prioritize:

- current balance
- payoff progress
- minimum payment
- CTA: record payment

Avoid long explanatory copy; show numbers first.

### Savings Section

Each goal card should emphasize:

- goal name
- saved / target
- monthly contribution
- progress bar
- CTA: fund goal

### Why This Matters

Today these live in separate tabs and feel siloed. The redesign should make planning feel like a single workflow.

## 4. Insights

### Purpose

Blend AI coaching with premium analytics instead of making the assistant feel like a separate tool.

### Layout

1. Overview header
2. Timeframe pills
3. Analytics cards
4. AI coach section
5. Recommended actions

### Top Section

Use a `Reports overview` style inspired by the reference:

- `Net income`
- `Total expenses`
- comparison vs previous period
- one or two dark chart cards

### Timeframe Pills

- `1W`
- `1M`
- `1Y`
- `YTD`
- `ALL`

Do not bury time filters inside charts.

### Analytics Cards

Prioritize:

- net income trend
- spending trend
- category pressure
- budget performance

Charts should be simplified and contrast-led. The current reports surface is correct in content, weak in hierarchy.

### AI Coach

Keep both current modes if needed, but visually present them as one coaching system:

- top insight summary
- ask-a-question composer
- recommendation cards below

First paint should not look like a chat app with a lot of blank space.

### Recommended Actions

Explicit action list generated from current insights:

- reduce category X by Y
- fund goal by Z
- recategorize N uncategorized transactions

## Navigation And Modal Changes

### Top-Level

Update [app/(tabs)/_layout.tsx](/Users/rhoads/budget-app/app/(tabs)/_layout.tsx) to the 4-tab structure.

### Modals To Keep

Retain route-based modals for:

- add transaction
- edit transaction
- add/edit bill
- add/edit debt
- debt payment
- add/edit/fund savings goal
- profile

### Modal Visual Refresh

All modal surfaces should inherit the new dark shell:

- darker scrim
- elevated sheet card
- stronger title hierarchy
- pill buttons instead of default light CTA bars

## Content Hierarchy Rules

Apply these consistently across screens:

1. one hero number per screen
2. at most 3 supporting numbers in the first viewport
3. only one primary chart above the fold
4. task/alert cards should beat explanatory copy
5. empty states should be shorter and more product-like

## Implementation Plan

### Phase 1: Foundation

- add new semantic tokens
- refactor `Card`, `Button`, and tab styling
- create shared pill and hero components

### Phase 2: Home + Activity

- redesign `Dashboard` into `Home`
- introduce `Activity` surface
- migrate transactions preview/search patterns

### Phase 3: Plan

- merge `Bills`, `Debts`, `Savings` into unified `Plan`
- keep existing underlying CRUD flows and modals

### Phase 4: Insights

- redesign `Insights`
- visually merge reporting and coaching
- add timeframe controls and premium chart framing

### Phase 5: Polish

- motion tuning
- haptics pass
- dark-mode contrast audit
- empty/loading/skeleton redesign

## Data And State Notes

No redesign step should bypass the current architecture:

- no direct SQLite access from UI
- continue using `useData()` and DataContext helpers
- derived screen summaries should come from DataContext or clearly-scoped selectors/hooks

Recommended additions:

- a derived `homeHealthSummary`
- a derived `planOverview`
- a derived `activitySummary`

These can live in DataContext or adjacent hooks, but should not be recomputed ad hoc in several screens.

## Risks

### Risk 1: Pure Visual Reskin Without IA Simplification

This would miss the main opportunity. The reference is compelling because it compresses choices, not just because it is dark.

### Risk 2: Overusing Accent Colors

The reference succeeds because bright accents are rare and meaningful.

### Risk 3: Keeping Too Many Equal-Priority Modules Above The Fold

Current screens often present multiple cards with similar visual weight. The redesign should create a stronger reading order.

### Risk 4: Chat-First Insights UI Taking Over The Screen

For this app, analytics should lead and conversation should support.

## Acceptance Criteria

- top-level navigation is reduced from 5 finance modes to 4 clearer modes
- `Bills`, `Debts`, and `Savings` are unified under `Plan`
- `Home` has a single dominant financial health story above the fold
- `Activity` becomes a dedicated transaction surface with search and filters
- `Insights` presents reports and coaching as one premium analytics experience
- all redesigned surfaces use semantic tokens, not ad hoc colors
- all business operations still flow through DataContext
- route-based modals remain intact and visually updated

## Recommended First Build Slice

If implementation starts immediately, build in this order:

1. theme tokens + dark card/button variants
2. 4-tab layout shell
3. `Home` hero card + quick actions + alerts
4. `Activity` transaction surface
5. `Plan` overview + one section at a time
6. `Insights` visual overhaul

This sequencing gets the highest user-visible leverage early without forcing a full rewrite of data logic.
