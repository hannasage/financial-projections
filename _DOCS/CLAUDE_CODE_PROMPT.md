# Savings Projection PWA — Claude Code Prompt

## Project Overview

Build a React-based Progressive Web App called **Projection** (working title) — a personal
financial scenario planner that lets users model multi-decade savings trajectories across
configurable income, debt, and major purchase timelines. Users can save multiple named
scenarios ("plans"), compare them visually on a shared chart, and filter/view them
individually.

The core simulation logic, UI design language, and single-plan component already exist in
`savings-scenario.jsx` (included in this repo). Use it as the foundation — do not rewrite
the simulation engine or redesign the visual style.

---

## Tech Stack

| Layer        | Choice                                                          |
|--------------|-----------------------------------------------------------------|
| Framework    | React 18 + Vite                                                 |
| Language     | TypeScript                                                      |
| Styling      | Inline styles + CSS Modules (match existing design system)      |
| Routing      | React Router v6                                                 |
| State        | Zustand (global), React state (local/form)                      |
| Auth         | PocketBase (self-hosted) — email/password + optional OAuth      |
| Database     | PocketBase collections                                          |
| Charts       | Recharts (already in use)                                       |
| PWA          | Vite PWA plugin (vite-plugin-pwa) + Workbox                     |
| Hosting      | User's own domain — build output is a static bundle + PocketBase|

---

## Design System

Carry the existing design language forward exactly:

```
Colors:
  bg:      #07090C   (page background)
  surface: #0D1117   (card/section background)
  faint:   #0A0E14   (input background)
  border:  #1B2535
  accent:  #C9F53A   (chartreuse primary — 7.1:1 on bg)
  dim:     #8CB025   (muted accent)
  blue:    #5B9CF6
  orange:  #F97316
  red:     #F87171
  purple:  #C084FC
  text:    #DDE3EE   (13.5:1 on bg)
  muted:   #8396AB   (5.8:1 on bg — AA compliant)

Typography:
  Display/headings: Syne 700/800
  Body/mono:        IBM Plex Mono 300/400/500

Standards: WCAG 2.1 AA throughout — min 10px labels, 11px body,
           focus-visible outlines, aria-label on all inputs,
           semantic HTML (header/main/section/footer/h1/h2)
```

Plan colors are user-chosen from a curated palette (8–12 options, all AA-compliant on
`#07090C`). Do not use arbitrary hex pickers.

---

## PocketBase Schema

### Collection: `users`
Managed by PocketBase Auth. No custom fields needed beyond defaults.

### Collection: `plans`
```
id          — auto
user        — relation → users (required)
title       — text (required, max 80)
description — text (max 300)
color       — text (one of the curated palette hex values)
scenario    — json (the full scenario object — see Scenario Shape below)
created     — autodate
updated     — autodate
```

Index: `user` field for fast per-user queries.

### Scenario JSON Shape
This is the serialized state of a single plan. Match field names exactly so the existing
component can be hydrated directly:

```ts
interface Scenario {
  envelope:     number;       // monthly discretionary cash
  startSavings: number;       // current savings balance
  startAge:     number;       // user's current age
  horizonYears: number;       // projection length
  returnMode:   "none" | "hysa" | "invested";
  taxPct:       number;
  baseSalary:   number;
  housingCost:  number;       // current monthly rent/housing
  debts: Debt[];
  purchases: Purchase[];
  raises: Raise[];
}

interface Debt {
  id:              string;    // crypto.randomUUID()
  label:           string;
  payment:         number;    // monthly payment amount
  payoffMonthIdx:  number;    // 0–11
  payoffYear:      number;
}

interface Purchase {
  id:          string;
  type:        "loan" | "house";
  label:       string;
  year:        number;
  monthIdx:    number;        // 0–11
  downPayment: number;
  loanAmount:  number;
  rate:        number;        // APR percent
  termMonths:  number;
  multiplier:  number;        // payment speed vs standard amortization
  payment:     number;        // computed: stdPayment(loanAmount, rate, termMonths) * multiplier
}

interface Raise {
  id:          string;
  year:        number;
  monthIdx:    number;
  salary:      number;
  baseSalary:  number;
}
```

---

## Application Structure

```
src/
  assets/               # icons, manifest assets
  components/
    plan/
      PlanEditor.tsx      # the full single-plan editing UI (from savings-scenario.jsx)
      PurchaseItem.tsx    # extracted purchase sub-component
      DebtItem.tsx        # extracted debt sub-component
      RaiseItem.tsx       # extracted raise sub-component
      ChartTooltip.tsx
    comparison/
      ComparisonChart.tsx # multi-plan overlaid area chart
      ComparisonTable.tsx # unified year-by-year table across all plans
      PlanToggle.tsx      # pill/chip to show/hide individual plans on chart
    shared/
      SectionHead.tsx
      StatBar.tsx
      ColorPicker.tsx     # curated palette selector
  lib/
    simulate.ts           # pure simulation engine (extracted from existing JSX)
    finance.ts            # stdPayment, payoffMonths, totalInterest, etc.
    pb.ts                 # PocketBase client singleton
    constants.ts          # COLORS, MONTHS, YEARS, START_YEAR, PLAN_COLORS
  pages/
    Auth.tsx              # login / register
    Dashboard.tsx         # comparison view (default landing after login)
    Library.tsx           # plan cards grid
    PlanNew.tsx           # new plan form → editor
    PlanEdit.tsx          # edit existing plan
  stores/
    authStore.ts          # PocketBase auth state (Zustand)
    plansStore.ts         # plans list, active filters (Zustand)
  hooks/
    usePlans.ts           # CRUD + realtime subscription via PocketBase
    useSimulation.ts      # memoized simulate() call
  App.tsx
  main.tsx
  vite.config.ts
  manifest.webmanifest
```

---

## Pages & Features

### Auth (`/auth`)
- Email + password register/login
- PocketBase handles sessions via localStorage token
- Redirect to `/dashboard` on success
- Minimal — same dark design, no social cruft

### Library (`/library`)
- Grid of plan cards (2-col mobile, 3-col desktop)
- Each card shows:
  - Color swatch bar across the top
  - Title + description
  - 3 milestone values: Start / Midpoint / End balance (from simulation)
  - Horizon length + growth mode badge
  - Edit and Delete actions
- "+ New Plan" button → `/plans/new`
- Empty state with a prompt to create the first plan

### Plan Editor (`/plans/new`, `/plans/:id/edit`)
- Full scenario editor (the existing `savings-scenario.jsx` UI)
- Top section: Title input, Description textarea, Color picker
- Below: all existing Core Settings, Debts, Purchases, Raises, Milestones, Chart, Table
- Save / Cancel footer bar (sticky on mobile)
- Auto-saves to PocketBase on Save; optimistic update in Zustand store

### Dashboard (`/dashboard`) — primary screen
The main comparison view. This is the most important screen.

**Plan toggles**
- Row of color-coded pill chips, one per plan, with plan title
- Click to toggle visibility on chart and table
- "All" / "None" shortcuts
- Active plans highlighted; inactive dimmed

**Comparison chart**
- Single Recharts AreaChart
- One `<Area>` per active plan, each using its stored color
- X-axis: age (0 to max horizonYears across all active plans)
- Y-axis: savings balance
- All simulations normalized to a shared timeline starting from the same `START_YEAR`
- Tooltip shows each active plan's balance at the hovered age
- Chart width fills container; height 280px desktop / 200px mobile

**Comparison table**
- Year-by-year rows
- Columns: Age, Year, then one "Balance" column per active plan (color-coded header)
- Rows run for the longest active plan's horizon
- Plans shorter than the table length show "—" after their end
- Horizontally scrollable on mobile

**Milestones row**
- One card per active plan showing start / midpoint / end balance
- Plan color as accent

---

## PWA Requirements

```ts
// vite.config.ts additions
VitePWA({
  registerType: "autoUpdate",
  manifest: {
    name: "Projection",
    short_name: "Projection",
    description: "Personal financial scenario planner",
    theme_color: "#07090C",
    background_color: "#07090C",
    display: "standalone",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  },
  workbox: {
    globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com/,
        handler: "StaleWhileRevalidate",
      },
    ],
  },
})
```

- App shell cached on install — usable offline (read-only, no PocketBase calls)
- Install prompt handled gracefully (don't fight the browser UI)
- Add to home screen works on iOS Safari and Android Chrome

---

## PocketBase Integration

```ts
// src/lib/pb.ts
import PocketBase from "pocketbase";
export const pb = new PocketBase(import.meta.env.VITE_PB_URL);
```

```ts
// src/hooks/usePlans.ts — key behaviors
// 1. On mount: pb.collection("plans").getFullList({ filter: `user = "${userId}"` })
// 2. Subscribe to realtime: pb.collection("plans").subscribe("*", handler)
// 3. Unsubscribe on unmount
// 4. CRUD: create / update / delete with optimistic Zustand updates
// 5. Scenario stored as JSON string, parsed on read
```

All PocketBase calls are authenticated via `pb.authStore.token` — PocketBase sets this
automatically after login and persists it to localStorage.

---

## Routing

```ts
<Routes>
  <Route path="/auth"              element={<Auth />} />
  <Route element={<RequireAuth />}>
    <Route path="/"                element={<Navigate to="/dashboard" />} />
    <Route path="/dashboard"       element={<Dashboard />} />
    <Route path="/library"         element={<Library />} />
    <Route path="/plans/new"       element={<PlanNew />} />
    <Route path="/plans/:id/edit"  element={<PlanEdit />} />
  </Route>
</Routes>
```

`RequireAuth` checks `pb.authStore.isValid` — redirects to `/auth` if not authenticated.

Bottom nav on mobile (Dashboard / Library / + New). Top nav on desktop.

---

## Plan Color Palette

All colors must be AA-compliant (≥4.5:1) on `#07090C`:

```ts
export const PLAN_COLORS = [
  { label: "Chartreuse", value: "#C9F53A" },
  { label: "Sky",        value: "#5B9CF6" },
  { label: "Tangerine",  value: "#F97316" },
  { label: "Lavender",   value: "#C084FC" },
  { label: "Coral",      value: "#F87171" },
  { label: "Mint",       value: "#34D399" },
  { label: "Gold",       value: "#FBBF24" },
  { label: "Rose",       value: "#FB7185" },
  { label: "Cyan",       value: "#22D3EE" },
  { label: "Slate",      value: "#94A3B8" },
];
```

New plans default to the first unused color in the list. ColorPicker renders as a row of
swatches with a checkmark on the active one.

---

## Key Implementation Notes

1. **Simulation is pure** — `simulate()` in `lib/simulate.ts` takes a `Scenario` object
   and returns `SimRow[]`. No side effects. Easy to call in parallel for multiple plans.

2. **Shared timeline** — the comparison chart and table align all plans to the same
   calendar axis (`START_YEAR` = 2026). Plans with different `startAge` values will have
   offset age labels per-plan in the tooltip but share the same x-axis (calendar year or
   age of the longest plan's user).

3. **useMemo everything** — each plan's simulation result should be memoized individually
   in the dashboard. Only re-run if that plan's scenario changes.

4. **No Redux** — Zustand is enough. `authStore` holds `{ user, token, isValid, login,
   logout }`. `plansStore` holds `{ plans, activePlanIds, toggle, setAll, setNone }`.

5. **Mobile-first** — the existing component is already mobile-responsive. Keep all new
   screens at the same quality level. Min touch target 44×44px.

6. **Type the scenario** — use the `Scenario`, `Debt`, `Purchase`, `Raise` interfaces
   above throughout. PocketBase returns `scenario` as a JSON field — parse with
   `JSON.parse()` and cast to `Scenario`.

7. **Error boundaries** — wrap the plan editor and comparison chart in error boundaries so
   a bad scenario object doesn't crash the whole app.

8. **Environment variables**
   ```
   VITE_PB_URL=https://your-pocketbase-instance.com
   ```

---

## Deliverables for First Session

Get to a working state in this order:

1. `vite create` + TypeScript template, install deps
2. Extract `simulate.ts` and `finance.ts` from `savings-scenario.jsx`
3. PocketBase client + auth store + login/register page
4. Plan CRUD (create, read, update, delete) with `usePlans` hook
5. Library page with plan cards
6. Plan editor page (port existing JSX, wire to PocketBase save)
7. Dashboard comparison chart (multi-plan overlay)
8. Dashboard comparison table
9. PWA manifest + service worker
10. Polish: nav, empty states, loading skeletons, error handling

---

## Files to Include in Context

When starting Claude Code, attach:
- `savings-scenario.jsx` — the full existing component (simulation engine + UI)
- This prompt (`CLAUDE_CODE_PROMPT.md`)

The existing JSX is the single source of truth for the simulation logic and visual design.
Extract from it; do not diverge from it.
