---
name: three-repo-architecture
description: SageAdvice three-repo portfolio project — projection-ui npm library, financial-projections migration, sageadvice-crm — spec location and session breakdown
metadata:
  type: project
---

Hanna is building a three-repo portfolio project per SAGEADVICE_CRM_SPEC.md at /Users/hannamacintosh/Projects/Code/sageadvice-crm/SAGEADVICE_CRM_SPEC.md.

**Why:** Portfolio case study: extract design system from existing app, publish to npm, migrate original app, build second production app on same foundation.

**How to apply:** Each session builds one piece; check spec for exact directory structure, package.json fields, and hard constraints before writing anything.

## Dependency chain
@hannasage/projection-ui (npm pkg) → financial-projections (this repo, save-your-ass) → sageadvice-crm (new CRM)

## Repos
- projection-ui: new at /Users/hannamacintosh/Projects/Code/projection-ui (does not exist yet)
- financial-projections: existing = save-your-ass (/Users/hannamacintosh/Projects/Code/save-your-ass)
- sageadvice-crm: new at /Users/hannamacintosh/Projects/Code/sageadvice-crm (spec only, no code yet)

## Session plan
- Session 1: Create projection-ui library + migrate save-your-ass to consume it
- Session 2: (from spec Session 2) already covered by session 1
- Session 3: Build sageadvice-crm

## Critical token architecture note
save-your-ass uses a JS-based multi-theme system (themes.ts + themeStore.ts with useColors() hook),
NOT CSS custom properties. The library will translate the default "projection" dark theme into
CSS custom properties using spec naming convention. The 12-theme JS system stays consumer-side.

## What's actually extractable from save-your-ass
- Modal.tsx: extractable with adaptation (remove useColors() dep, use CSS vars instead)
- @dnd-kit usage: inline in PlanCard — library adds Sortable/SortableItem wrapper
- Charts: ComparisonChart is highly app-specific, not extractable — library provides generic wrappers
- Button/Card/Input/etc.: don't exist as standalone components — will be written fresh in library

## Hard constraints per spec
- Zero React in bundle output (peer dep)
- theme.css must output to dist/tokens/theme.css
- All components accept className prop
- No hardcoded color values in component files (CSS vars only)
- TypeScript strict mode throughout
