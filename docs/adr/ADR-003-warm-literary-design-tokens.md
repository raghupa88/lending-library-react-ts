# ADR-003: Warm-literary design tokens with measured WCAG AA contrast

## Status
Accepted (2026-07-04)

## Context
The old UI was ~960 lines of ad-hoc global CSS with hardcoded colors and no
token layer, despite a dark-mode toggle. The redesign needs one design system
serving both the member app and the admin panel, meeting WCAG 2.2 AA.

## Decision
Tailwind CSS v4 with CSS-first tokens in `src/styles/globals.css`: semantic
variables (`--background`, `--accent`, …) flipped by `data-theme` on `<html>`,
mapped into Tailwind via `@theme inline`. Fraunces (display serif) + Inter
(body), self-hosted via Fontsource. Components are shadcn-style copy-in files
under `src/components/ui/` using CVA + tailwind-merge.

Contrast is *measured*, not assumed. Two planned colors failed AA and were
fixed: warning text darkened to `#8a6508` (3.02:1 → 6.9:1 on paper) and
dark-mode primary buttons use ink `#181410` text on the accent (white was
2.98:1). Playwright specs assert zero axe WCAG A/AA violations per page in
both themes.

## Consequences
- New screens compose tokens + `ui/` primitives; page-level CSS files die with
  each legacy page.
- Theme changes are one-variable edits validated by the axe gate in e2e.
