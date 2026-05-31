---
name: resume-styles
description: hannasage/resume Next.js site — design system, component inventory, and what projection-ui will need for migration
metadata:
  type: project
---

Resume is at https://github.com/hannasage/resume — Next.js 14, Tailwind, same brand palette as financial-projections.

**Why:** Same visual brand. Will be migrated to projection-ui in a future session.

**How to apply:** When migrating resume, know which new components are needed and what patterns to map.

## Palette (same as financial-projections)
- Accent: #C9F53A, Background: #07090C, Text: #DDE3EE, Border: #1B2535
- Muted: #8396AB, Danger: #F87171
- Secondary CTA color: #5B9CF6 (bright blue — NOT in current UITheme, needed for gradient CTA)

## Fonts
- IBM Plex Mono (300/400/500) — body/UI
- Syne (700/800) — display headings

## Key CSS patterns (globals.css)
- `.panel` = `background: var(--color-panel) + border + border-radius: 4px` → maps to `<Card>`
- `.panel-flat` = `background: var(--color-bg) + border` → maps to `<Card border="subtle">`  
- `.eyebrow` = `11px, font-weight 500, letter-spacing 0.14em, uppercase, color: accent`
- `.hairline` = border-color variable
- `.grid-bg` = radial gradient dot pattern (brand texture)
- `.pip` = 8px animated blinking dot (status indicator)
- `::selection` = accent background

## Components that need projection-ui equivalents
- `Button` (primary/secondary/ghost/social variants) → library `Button` — needs `variant="icon"` (social) and `variant="cta"` (gradient)
- `Card` → library `Card` ✓
- `SkillTag` → library `Badge` (NEW — inline pill with accent dot prefix)
- `ProjectCard` → app-specific, uses Card + Badge inside
- `TimelineItem` → app-specific layout
- `WorkDeliverableCard` → app-specific, uses Card

## What projection-ui needs BEFORE resume migration
1. `Badge` component — inline pill with optional dot prefix (SkillTag pattern)
2. `Button variant="icon"` — rounded-full, icon-only, for social links
3. `Button variant="cta"` — gradient CTA (needs `secondary` color added to UITheme for 2-color gradient)
4. UITheme needs `secondary?: string` token for the #5B9CF6 CTA secondary color
5. Export `eyebrow` CSS class or `Eyebrow` component for the label pattern

## Stack specifics
- Next.js App Router (app/ directory)
- Tailwind for layout/spacing (will be replaced with CSS custom properties from library)
- ThemeProvider already implemented (same projection-themes.ts)
- Uses `--font-plex-mono` and `--font-syne` CSS vars via next/font
