# BUILDLOG — financial-projections (save-your-ass)

---

## 2026-05-31 — projection-ui extraction + migration

**What I built:**
- Extracted `@hannasage/projection-ui` as a standalone npm package (v0.1.0–0.1.5) from the component patterns in this app
- ThemeProvider that accepts a `UITheme` object and writes 14 CSS custom properties (`--ui-*`) — no hardcoded themes, consumer-defined palette
- 3 radius presets: `sharp` | `soft` | `rounded` — from 0px corners to full pill mode
- Components shipped: Button (4 variants, 3 sizes), ButtonGroup (chip + segmented variants), Card, Modal, Slider, Toggle, Input, Select, Textarea, Badge, Skeleton, DataTable, SortableList/SortableItem, ToastContainer, AreaChart, BarChart, LineChart, DonutChart
- Storybook configured with dark-theme default, story per component
- Published to npm (`@hannasage/projection-ui`) and GitHub (`hannasage/projection-ui`)
- Migrated this app to consume the published package: ThemeProvider wraps entire app, `toUITheme()` adapter bridges existing 12-theme JS system to CSS vars, all UI primitives replaced with library imports
- WCAG 2.2 AA accessibility pass: role="log" on ToastContainer, aria-label on Toggle switch div, Slider aria-label prop, tabIndex on scrollable tables, 32px minimum touch targets, unlabeled form inputs fixed

**Decisions made:**
- [DECISION] Consumer-defined themes, no library presets: instead of bundling named themes, ThemeProvider takes a plain UITheme object. Reason: the app already has a 12-theme JS system; a second theme list would create parallel state. The adapter pattern lets existing themes feed CSS vars without touching store logic.
- [DECISION] 8 semantic tokens + 3 radius presets: resisted the spec's 30-token system. Fewer tokens = easier theming for consumers. radius as a named preset (sharp/soft/rounded) rather than raw px values — intent is clearer and prevents half-baked intermediate values.
- [DECISION] ButtonGroup chip variant as default: the original app's "chip" style (individual floating pills, each with independent border that activates on selection) is the primary pattern. The joined segmented control is an explicit `variant="segmented"` opt-in. Reason: chip style is used 10:1 in the codebase.
- [DECISION] ComparisonChart, ComparisonTable, ThemeSelector left local: these components have app-specific logic (marker overlays, 12-theme color remapping, multi-plan simulation rendering) that would require library extensions too narrow to be reusable. Documented in place.
- [DECISION] Party mode code left dormant in resume: the lerp animation and party theme system in the resume's ThemeContext is complex and high-risk to migrate. Leaving as-is; --ui-* bridge vars allow library components to render correctly without touching it.
- [DECISION] padding: shorthand vs longhands in CSS-in-JS: `padding: '7px 10px'` was being overridden by the `* { padding: 0 }` reset from some apps. Switched all Input/Select/Textarea to explicit paddingTop/Bottom/Left/Right longhands — immune to shorthand cascade ordering.

**Interesting problems:**
- `padding` CSS shorthand in React inline styles was silently zeroed out by consuming app's global `* { padding: 0 }` reset. Longhand properties are not affected by shorthand resets — switched all form fields to explicit paddingTop/paddingBottom/paddingLeft/paddingRight.
- vite-plugin-dts v4 broken dep chain (ajv/api-extractor conflict) → pinned to v3 which is stable with Vite 8.
- Storybook 8.x declares peer dep for Vite ^4–6 but works fine with Vite 8 at runtime → `legacy-peer-deps=true` in .npmrc.
- npm publish of v0.1.1–0.1.2 included stale dist (build ran in wrong directory) → v0.1.3 was the first correctly-built release. Always verify dist content with `grep` before publishing.
- `react-is` not hoisted as a transitive dep of recharts in consuming apps → added explicit `npm install react-is` and `resolve.dedupe` in vite.config.ts.
- `role="switch"` div needs its own `aria-label` even when wrapped in a `<label>` element — the `<label>` provides the label for the hidden checkbox, but screen readers read the div's role separately.

**What's next:**
- Session 2: sageadvice-crm — production CRM for a financial advisory practice, built on @hannasage/projection-ui
- Resume migration: complete Badge swap, bridge --ui-* vars, document remaining Tailwind-specific components
- projection-ui v0.2.0: secondary color token (for resume's gradient CTA button), Eyebrow typography component, UITheme.radius per-component override
