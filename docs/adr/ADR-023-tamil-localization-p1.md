# ADR-023: Tamil localization, phase 1 — i18n infrastructure + first-touch pages

## Status
Accepted (2026-07-09)

## Context
Third item on the user's explicit priority order (referral credits +
gift subscriptions → **Tamil localization** → B2B tier →
backend/infra), and a backlog item from the PM/principal-engineer
review: "Tamil UI + Tamil catalog metadata is a genuine market
differentiator." The catalog already carries Tamil-language books
(the `language` filter has supported "Tamil" since Branch 2), but the
UI chrome itself has always been English-only.

This is a materially different kind of branch than the ~20 that
preceded it: every prior branch was a vertical feature slice (backend
+ frontend + tests for one capability). Localization is a horizontal
sweep — the same small change (wrap a string in a translation call)
repeated across every page in the app. Translating all ~15 member
pages plus the Admin panel plus the entire Suvadi Learn platform in one
pass would be a much larger, differently-shaped unit of work than any
branch so far, and risks doing all of it shallowly rather than a
representative slice of it well.

## Decision
1. **Scope this branch to infrastructure + the first-touch pages**:
   the i18n system itself (context, dictionaries, font, language
   switcher — the part that has to be right for anything else to build
   on it), plus full translation of Nav, Footer, Home, Login, and
   Register — the pages an unauthenticated Tamil-speaking visitor
   actually sees before ever deciding to sign up. This mirrors how
   Branch 1 (`feat/ui-foundation`) proved the entire design system
   through Home as "the showcase screen," and how Suvadi Learn itself
   shipped across six branches (L1–L6) rather than one. **Books,
   BookDetail, Dashboard, Plans, Profile, Gift, the Admin panel, and
   the Learn platform remain English-only and are explicitly deferred
   to a phase-2 branch** — this is a scoping decision I made
   autonomously, the same kind of judgment call as splitting referral
   credits from gift subscriptions earlier in this project.
2. **A hand-rolled `LocaleContext`, not `react-i18next`.** This
   codebase has consistently avoided pulling in packages for problems
   it can solve simply and directly — its own `Tabs`, `Dialog`, `Toast`,
   and `Sheet` are hand-built rather than sourced from a component
   library. Two static locales with flat dot-path keys and `{{var}}`
   interpolation is genuinely simple: a `t(key, vars?)` function that
   looks up a nested dictionary with an English fallback is well under
   100 lines (`src/context/LocaleContext.tsx`) and needs no runtime
   dependency, plugin system, or namespace loader that a full i18n
   library would bring for functionality this project doesn't need.
   `LocaleContext` mirrors the existing `ThemeContext` exactly: same
   shape (`useX()` hook + `XProvider`), same persistence pattern
   (`localStorage`, restored on boot), same attribute-on-`<html>`
   mechanism dark mode already uses (`data-theme` → `data-locale`, plus
   `lang` for accessibility/screen readers).
3. **Dictionaries are plain TypeScript objects, not JSON**, so a typo
   in a key path used at a call site plus a missing key in `ta.ts`
   both get caught by `tsc` rather than silently falling back at
   runtime: `export type Dictionary = typeof en` in `en.ts`, and
   `ta.ts` types its export as `Dictionary` — the compiler rejects
   `ta.ts` if it's missing a key `en.ts` has (this was tested during
   the build: TypeScript widens string-literal object properties to
   `string` by default, which is exactly the behavior wanted here so
   Tamil string *values* aren't type-checked against the English
   *values*, only the key *shape* is).
4. **`@fontsource-variable/noto-sans-tamil`, not a second serif face
   for headings.** Fraunces and Inter (the existing display/body fonts)
   have no Tamil glyphs. Rather than sourcing and maintaining a
   separate Tamil "display" font to preserve the serif/sans split in
   Tamil mode, both `--font-display` and `--font-sans` fall back to the
   same Noto Sans Tamil face under `[data-locale="ta"]` in
   `globals.css` — a reasonable typographic compromise given Tamil
   variable serif faces are far less mature than Latin ones, and
   Noto Sans Tamil is Google's most complete, well-hinted Tamil face.
5. **The language switcher lives in the navbar next to the theme
   toggle** (a `Languages` icon button showing "EN"/"த", mirroring the
   existing sun/moon toggle's placement and interaction exactly) rather
   than in a settings page or the footer — same reasoning as why the
   theme toggle lives there: it's the one piece of global UI state a
   visitor might want to change on any page, so it belongs in the one
   piece of chrome present on every page.
6. **The shared `Field` component's "(optional)" label was translated
   too**, even though it's used by pages outside this phase's scope
   (Profile, Plans, Gift). This was a deliberate exception to the
   phase-1/phase-2 boundary: it's one string in one already-shared
   component, costs nothing to translate now, and only ever improves
   things — an as-yet-untranslated page in Tamil mode was always going
   to show "(optional)" in English; now that one particular tag at
   least matches the surrounding locale.

## Consequences
- Frontend: `npm run typecheck`, `npm run lint`, `npm test`, and
  `npm run build` all pass. New Tamil font subset assets appear in the
  production build (`noto-sans-tamil-*.woff2`).
- e2e: 5 new Playwright specs (`e2e/specs/localization.spec.ts`) —
  language toggle switches Nav/Home/Footer text and back, persists
  across a reload, the Tamil-mode body computed `font-family` includes
  "Noto Sans Tamil", Login/Register render fully in Tamil, and no new
  WCAG A/AA violations in Tamil mode. Full suite (202 specs) passes
  with no regressions.
- Verified visually in the browser: Home, Register (light and dark
  mode) render correctly and completely in Tamil script with no
  fallback tofu/missing glyphs, the language switcher shows the current
  language and toggles correctly, and dark mode + Tamil combine
  correctly (no contrast regressions from the font change alone, since
  color tokens are untouched by this branch).
- Every other member page (Books, BookDetail, Dashboard, Plans,
  Profile, Gift), the Admin panel, and the entire Suvadi Learn platform
  remain English-only for now — this is the explicit, acknowledged
  scope cut of this ADR, not an oversight. A phase-2 branch extending
  the same `LocaleContext`/dictionary system to those pages is the
  natural next step whenever Tamil localization is revisited.
- The B2B tier and the Appendix B backend/infra items remain the next
  items in the user's stated priority order, still untouched.
