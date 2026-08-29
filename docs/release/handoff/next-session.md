# Handoff → Sessions F..N (content) + Z (release verification)

_Written at the close of **Session E** (ops & resilience), 2026-08-29. Overwrite this file
at the close of each session; the previous copy is archived as `03-erasure.md`._

**Paste this whole file into a fresh session to start.**

---

## Session E closed — what landed (the code path is now COMPLETE)

All of checklist **D · Ops and resilience** and the **E.3** security-headers/CSP items.
`npm run check`, `npm test` (93/93) and `next build` are all clean.

| File | What it is |
| --- | --- |
| `app/global-error.tsx` | **New.** Last-resort boundary; renders its own `<html>`/`<body>`, inline-styled (no globals/ThemeProvider available here) |
| `app/not-found.tsx` | **New.** Root 404 in the root layout; brand chip + "Back to home" |
| `app/(main)/error.tsx` | **New.** Client boundary inside the authenticated shell — sidebar stays, only content is replaced; `reset()` + logs to console (Sentry captures) |
| `app/(auth)/error.tsx` | **New.** Client boundary for the auth surface |
| `lib/sentryScrub.ts` (+ `.test.ts`) | **New.** Pure PII scrubber (cookie jar, Cookie/Authorization/`sb-*` headers, email, IP) used in every `beforeSend`. 4 unit tests |
| `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation-client.ts`, `instrumentation.ts` | **New.** Sentry init per runtime + `register()`/`onRequestError`/`onRouterTransitionStart`. Inert without `NEXT_PUBLIC_SENTRY_DSN`, production-only |
| `next.config.ts` | Wrapped with `withSentryConfig`; added `poweredByHeader:false`, security headers and a **report-only CSP** via `async headers()` |
| `app/layout.tsx` | Full metadata (`metadataBase`, title template, robots-off, OG/Twitter) + `<Analytics />` + `<SpeedInsights />` (cookieless) |
| `app/icon.tsx`, `app/apple-icon.tsx`, `app/opengraph-image.tsx`, `lib/site.ts` | **New.** Brand images generated with `next/og`; site identity constants |
| `app/robots.ts` | **New.** Site-wide `disallow` (noindex). `/robots.txt` added to `proxy.ts` `publicRoutes` |
| `.github/workflows/ci.yml` | **New.** `npm ci` → `npm run check` → `npm test` on push + PR |
| `lib/courseContent.test.ts` | Stale newline-rejection test fixed (targets single-line fields; positive prose/callout newline cases added) |
| `supabase/migrations/038_account_export_rate_limit.sql` | **New — APPLIED to prod 2026-08-29.** Export rate limit: log table + BEFORE INSERT trigger raising `PT429`, mirroring `feedback_rate_limit` (026) |
| `app/api/account/export/route.ts` | Logs-and-counts (429 + `Retry-After`) before the reads |
| `docs/release/legal/subprocessors.md` | Sentry + Vercel Analytics rows flipped from "not yet added" |
| `.env.example`, `.env.local.example` | Sentry + `NEXT_PUBLIC_SITE_URL` documented |
| `CLAUDE.md` | New deviation entry recorded (error boundaries, Sentry, CSP, analytics, OG/robots, export limit) |

**Design notes:** CSP is report-only and nonce-free on purpose — a nonce forces every page
dynamic, discarding the app's static/streamed rendering. Tighten to enforcing later.
Sentry sends nothing until a DSN is set; create the project in the **EU region**.

## State at close

- `npm run check` — **clean**. `npm test` — **93 pass / 0 fail**. `next build` — **clean**
  (Sentry warns only that source-map upload is skipped without the auth token — expected).
- Highest migration: **`038` APPLIED** (035 → 036 → 037 → 038 all on prod).
- **Nothing is committed.** The whole 1.0 tree + Session E + the Courses changeset are
  uncommitted. New deps added: `@sentry/nextjs`, `@vercel/analytics`, `@vercel/speed-insights`.
- One manual (non-code) item remains open in the checklist: **confirm Supabase Auth's own
  signup/email limits** in the dashboard (§D — do NOT rebuild).

## Your task — Sessions F..N (content) then Z (verification)

The code path is done. What remains is **content** and **release verification** — the user
authors content themselves; your role in F..N is running the import + regeneration loop.

1. **Content (§C)** — deficit at last measure **346 (176 hard)**; three subjects unplayable
   (`data_analysis`, `esports_history`, `trivium`). Regenerate the live state with
   `npx tsx --env-file=.env.local scripts/build-content-prompts.ts`, import batches with the
   `import-question-batch` skill, re-run the regen after each import. `esports_history` is
   blocked on more subtopics in `data/subjects.json` (only "Counter Strike" exists).
2. **Release verification (§F / Session Z)** — `npm run check` · `npm test` · `next build`
   clean; the full manual pass on a throwaway account (`verify` skill); `curl -I .../terms`
   → 200 signed in and out; `npm run bench -- --target=prod` as the 1.0 baseline; tag
   `v1.0.0`. Confirm Resend domain + Supabase Auth URL config one last time.

## Open items carried forward (small, not blocking content)

- **Enforce the CSP** (drop report-only) once real traffic shows no violations — a 1.1 item,
  noted in §E.
- Set the Sentry DSN (EU project) + `SENTRY_*` build vars in Vercel when the project exists.

## Decisions locked — do not reopen

Public but unlisted (`noindex`) · GDPR/UK-GDPR + Serbian law · 16+ · free · erasure by
anonymise/block · Courses off · author nav hidden · legal pages public · rate limiting on
signup + export only · **no cookie banner** (Sentry EU + cookieless analytics keep this true).

## Sequence and what's deferred

A ✅ → B0 ✅ → C legal ✅ → D erasure ✅ → **E ops ✅** →
**F..N content ← you are here** → Z verification.

- After the content is filled and Z passes, 1.0 is ready to tag. The code is complete.

## Close-out (required — plan §6 working rule)

1. Tick the relevant items in `docs/release/definition-of-ready-1.0.md`; annotate the plan
   file's §6.
2. Rewrite this file for the next session, archiving this copy as `04-ops.md`.
3. Report to the user: steps done / left and the current content deficit number.

## Constraints

- **Next.js 16.** `next lint` does not exist; gate is `npm run check`. Middleware is `proxy.ts`.
- Design fidelity rules in `CLAUDE.md` are binding; record any new deviation there.
- `.sql` under `supabase/migrations/` is confirmed with the user before pushing.
- A stray verification script belongs in the scratchpad or repo root and must be deleted
  after — do not leave it in `scripts/` (linted, would need its own types).
