# Projection

Offline-first personal finance scenario planner: compare cash (“liquidity”), debt balances, investments, and net worth across plans without tying projections to a live brokerage feed.

## What it does

- **I/O library**: Debts, recurring bills, purchases, investments (optional timing/sells/simplified capital-gains tax), and raises—defined once and reused across scenarios.
- **Scenarios**: Toggle library entries per plan; optionally cascade freed debt payments (FIFO-style onto the next balance-tracked debt in list order).
- **Simulation**: Deterministic month-step engine (`simulate`): envelope flows → liabilities → optional nominal envelope inflation once per projection year → cash yield vs separate investment buckets.

Outputs are **month-granular, nominal-dollar estimates** with simplified taxes and smooth yields—good for directional decisions, not tax filings or precision budgeting.

## Run locally

```bash
npm install
npm run dev
```

```bash
npm run build   # typecheck + production bundle
npm run test    # golden regression checks on the simulator
npm run lint
```

## Tech stack

React + TypeScript + Vite + Zustand, charts via Recharts, optional PocketBase sync plus fully usable **local-only mode**.

## Backup / migration

Export JSON backups from **I/O**; restores sanitize malformed numeric fields so corrupted drafts degrade gracefully instead of crashing the runtime.

## License / advisory

This is educational tooling, not financial advice.
