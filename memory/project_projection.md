---
name: Projection PWA — project context
description: Save Your Ass / Projection savings planner — tech stack, architecture, and setup
type: project
---

React 18 + Vite 8 + TypeScript PWA called "Projection" — multi-scenario savings planner.

**Why:** Personal financial scenario planner with PocketBase backend, multi-plan comparison, PWA install.

**How to apply:** Reference this when adding features, debugging, or adjusting architecture.

## Stack
- React 19 + Vite 8 + TypeScript (strict)
- Zustand (authStore, plansStore)
- PocketBase self-hosted — env var: VITE_PB_URL (default http://127.0.0.1:8090)
- Recharts (AreaChart for single + multi-plan comparison)
- React Router v7 (BrowserRouter + Routes/Route/Outlet pattern)
- vite-plugin-pwa + Workbox (service worker, autoUpdate)

## Key source structure
- src/lib/types.ts — Scenario, Debt, Purchase, Raise, SimRow, Plan interfaces
- src/lib/simulate.ts — pure simulate(scenario, returnRate) => SimRow[]
- src/lib/finance.ts — stdPayment, payoffMonths, totalInterest, payoffLabel, money, shortK
- src/lib/constants.ts — COLORS, PLAN_COLORS, MONTHS, YEARS, START_YEAR, RETURN_RATES
- src/lib/pb.ts — PocketBase singleton
- src/stores/authStore.ts — login/register/logout, syncs with pb.authStore.onChange
- src/stores/plansStore.ts — plans[], activePlanIds Set, toggle/setAll/setNone
- src/hooks/usePlans.ts — CRUD + realtime PocketBase subscription
- src/hooks/useSimulation.ts — memoized simulate() call
- src/components/plan/PlanEditor.tsx — full plan editor (ported from savings-scenario.jsx)
- src/components/comparison/ — ComparisonChart, ComparisonTable, PlanToggle
- src/pages/ — Auth, Dashboard, Library, PlanNew, PlanEdit

## Design system
- Colors all inline (no CSS modules): bg=#07090C, accent=#C9F53A, text=#DDE3EE
- Fonts: IBM Plex Mono (body/mono), Syne (headings, class="syne")
- Global CSS classes: .sec, .g2, .tbl, .mg, .syne, .skip-link

## PocketBase schema
Collection: plans — fields: user (relation), title (text), description (text), color (text), scenario (json), created/updated (autodate)

## Run / build
- npm run dev — starts Vite at :5173
- npm run build — TypeScript check + Vite production build (outputs to dist/ with SW)
- Requires .env with VITE_PB_URL pointing to running PocketBase instance
