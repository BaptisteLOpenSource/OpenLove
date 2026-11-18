# CLAUDE.md - OpenLove

Self-hostable couple app. One instance = one couple. Web (Next.js PWA) + Android (Kotlin). Clean
rewrite of a private couple app (location: `CLAUDE.local.md`, gitignored;
Android ref = branch `mobile`). Source = code base to mine, NOT to copy: rewrite KISS/YAGNI/DRY.

## Status

Source of truth = GitHub Project v2 "OpenLove" board (Epics + native sub-issues).
Plan (local, gitignored, may be absent on a fresh clone): `.superpowers/2026-10-15-openlove-plan.md`.

## Read first

- `ARCHITECTURE.md` - layout, layers, rules, security fixes.
- `CONTEXT.md` - domain glossary. Use its terms, avoid its "avoid" column.
- `docs/decisions/` - ADRs. Contradicting one -> say so, never silently override.
- `.superpowers/source-inventory.md` (local only, may be absent) - feature map of the source app.

## Monorepo

| Path | What |
|---|---|
| `web/` | Next.js App Router: UI + `/api/*` (the ONLY backend, Android included) |
| `mobile/` | KMP Gradle project: `shared/` (Ktor client, DTOs, Json, SQLDelight; Android + iOS targets), `androidApp/` (Compose Material3, manual DI, minSdk 26) |
| `contracts/` | JSON fixtures generated from Zod (`web/src/shared/contracts`), decoded by Android tests |
| `design/tokens.json` | M3 typography, shape, default seed. Color scheme computed at runtime from the Couple's seed, served by `/api/theme` |
| `supabase/` | migrations, seed (Supabase = single data path, no memory fallback) |

No pnpm workspace: `web/` = pnpm project, `mobile/` = Gradle project, side by side.

## Setup

- Prereqs: Node >=22.18, pnpm 10.34.7, JDK + Android SDK (mobile), Supabase CLI.
- `cp web/.env.example web/.env.local`, then open `/setup`: its checklist comes from the env Zod schema.

## Commands

```bash
cd web && pnpm dev | pnpm build | pnpm type-check | pnpm lint | pnpm format | pnpm test | pnpm arch-test | pnpm knip
cd web && pnpm contracts      # regenerate contracts/*.json from Zod
cd web && pnpm seed           # seed DB, reads web/.env.local
cd web && pnpm e2e            # Playwright
cd mobile && ./gradlew :shared:allTests :androidApp:testDebugUnitTest :androidApp:lintDebug ktlintCheck
supabase start                # local Postgres/Auth/Storage for dev
```

Done = `type-check && lint && test && arch-test && knip` green (web) + `:shared:allTests :androidApp:testDebugUnitTest` green (mobile).

## Hard rules

- Android talks ONLY to `/api/*` (Bearer JWT). Never Supabase direct. Web UI uses cookies.
- Every route goes through `withContract(req, res, {auth})`: Zod in + out, auth not optional.
- Envelope `{data} | {error:{code,message}}`. Codes machine-readable, message EN.
- Reveal (surprise, letter) decided by SERVER clock only. Never ship unrevealed content.
- One client per external service: Supabase, FCM, TMDB, Nominatim, GIF provider.
- Ports only with 2 real impls (`MediaStore`: Supabase Storage now, Google Drive later).
- Env validated by ONE Zod schema; `/setup` page renders its checklist from that schema.
- i18n wired (next-intl web, `strings.xml` Android), FR only in v1. No hardcoded UI strings.
- Zero personal data: no names, emails, UUIDs, paths, photos from source. Source pointers live
  ONLY in `CLAUDE.local.md`. CI grep gate (`ci.yml`) blocks secret-shaped tokens only; personal-data check is manual.
- No copyrighted assets (Ghibli dropped).

## Out of v1

Quiz (dropped), RadioBox, Chrome extension, Google Drive MediaStore, Docker/VPS (after all
features + UX), EN locale. Changelog = section of `/settings`, not a page.

## Tools

- Material: Context7 for Compose/Tailwind docs. Google Design MCP (`design.googleapis.com/mcp`,
  needs Google Cloud auth) for icon search and previewing the default seed scheme (`generate_color_scheme`).
- UI acceptance: Playwright (web), Compose UI tests (Android).

## Agent skills

### Issue tracker

GitHub issues on `BaptisteLOpenSource/OpenLove` (Epic + native sub-issues, Project v2 board). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `CONTEXT.md` + ADRs in `docs/decisions/`. See `docs/agents/domain.md`.
