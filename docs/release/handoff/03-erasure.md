# Handoff → Session E (ops & resilience)

_Written at the close of **Session D** (right to erasure), 2026-08-29. Overwrite this file
at the close of each session; the previous copy is archived as `02-legal-surface.md`._

**Paste this whole file into a fresh session to start.**

---

## Session D closed — what landed

Account deletion by anonymisation is built, applied to prod, and verified end-to-end.

| File | What it is |
| --- | --- |
| `supabase/migrations/037_account_deletion.sql` | **New, APPLIED to prod.** `profiles.deleted_at`; `delete_my_account()` (SECURITY DEFINER, returns JSONB); `deleted_at IS NULL` guard added to `get_leaderboard` / `get_my_rank` / `get_competitive_leaderboard` (re-emitted verbatim from 031 + one predicate each) |
| `app/api/account/delete/route.ts` | **New.** `POST`, no caller input. Calls the RPC; on `owns_groups` returns 409 + group list; on success removes avatar objects and BANS the auth user via the service role, then signs the caller out |
| `lib/supabase/admin.ts` | **New.** First service-role client — server-only, bypasses RLS |
| `lib/accountDelete.ts` | **New.** Pure constants (endpoint, `DELETE` confirm phrase, effects/retained copy) mirroring `lib/accountExport.ts` |
| `app/(main)/settings/DataPrivacySection.tsx` | Danger-zone card below the export; type-`DELETE` confirm dialog; owns-group error links to `/groups/[id]` |
| `app/(auth)/login/page.tsx` | Added `account_deleted` notice for the post-deletion redirect |
| `CLAUDE.md` | New deviation entry for the delete surface |

**Design (locked, ADR 0002 — do not reopen):** erase the person, keep the record anonymised.
A user who owns a group with **other members** is **blocked** (named groups, links) — NOT
auto-transferred. Solo-owned groups are deleted. The auth row is **banned, not deleted** (six
FKs to `profiles` forbid delete). `results` / authored `questions`/`quizzes` stay, unattributable.

**Verified end-to-end** on throwaway accounts (created + cleaned up via the service role,
15/15 assertions): consent stamping (036), block path with named groups and no side effects,
anonymise (`display_name`→'Deleted user', name/city/avatar nulled, `deleted_at` + `opt_out`
set), solo group deleted, membership cleanup, other member's group survives, sign-in rejected
after ban ("User is banned"). The HTTP route's avatar-removal branch was not hit (test users
had no avatar) but is a standard storage call.

**Migration 036 (terms/consent) was also pushed and verified this session.**

## State at close

- `npm run check` — **clean**. (If tsc errors on `.next/dev/types/routes.d.ts`, that is a
  stale Turbopack dev artifact — `rm -rf .next` and re-run; not a code error.)
- `npm test` — **85 pass / 1 fail**, the SAME pre-existing stale test
  (`lib/courseContent.test.ts` › "embedded newline is rejected", contradicts commit
  `e82c3aa`). **Fix it THIS session before wiring CI** (see task list).
- Highest migration: **`037_account_deletion.sql`, APPLIED** (035 → 036 → 037 all on prod now).
- **Nothing is committed.** Whole 1.0 tree + the Courses changeset remain uncommitted.
- Production users: 18 (unchanged; the throwaway test accounts were created and deleted).

## Your task — Session E (ops & resilience)

All of checklist **D · Ops and resilience** + **E.3** (security headers/CSP). Do error
boundaries first — they are the highest value and nothing exists today.

1. **Error boundaries** (none exist — a server throw shows Next's raw page):
   `app/global-error.tsx`, `app/not-found.tsx`, `app/(main)/error.tsx`, `app/(auth)/error.tsx`.
   Compose from existing card/button classes and the `ErrorDialog.tsx` copy voice. The
   `(legal)` group has its own layout — consider whether it needs its own `not-found`.
2. **Fix the stale test** — `lib/courseContent.test.ts` "embedded newline is rejected". Commit
   `e82c3aa` made `authoredString(1, { allowNewlines: true })` accept `\n` in prose/example/
   callout bodies; the rejection case was never updated. Suite must be green before CI.
3. **CI** — `.github/workflows/ci.yml`: `npm ci`, `npm run check`, `npm test` on push + PR.
   None today.
4. **Sentry** (server + client + edge) — scrub `sb-*` cookies + email from payloads. Add to
   `docs/release/legal/subprocessors.md` (the "not yet added" row exists) and flip it.
5. **Vercel Analytics + Speed Insights** (cookieless — keeps the no-banner position). Same
   subprocessor-table flip.
6. **`app/robots.ts`** returning `noindex` (launch is unlisted). **It must be added to the
   proxy's `publicRoutes`** or it 307s to `/login` like everything else — the `publicRoutes`
   list is already in `proxy.ts` from Session C (`/terms`, `/privacy`, `/subprocessors`), just
   add `/robots.txt`. Verify the pattern.
7. **Metadata** in `app/layout.tsx` (currently only `title` + `description`): `metadataBase`,
   OpenGraph/Twitter, real `icon`/`apple-icon`, `opengraph-image`. Remove the stock Next.js
   SVGs from `public/`.
8. **Security headers** in `next.config.ts` (none today): `poweredByHeader: false`,
   `X-Frame-Options`, `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy`.
   Then a **CSP report-only first** — Next inline scripts, the `next-themes` pre-hydration
   script, KaTeX, and the Supabase/Sentry origins all need allowing. Note `next.config`
   already derives the avatar remote host from `NEXT_PUBLIC_SUPABASE_URL`.
9. **Rate-limit `/api/account/export`** following the `feedback_rate_limit` Postgres-trigger
   pattern (`lib/feedback.ts`, `PT429`). Confirm Supabase Auth's own signup/email limits in
   the dashboard (do not rebuild them).

`next.config.ts` changes need care — a service-role client and the CSP both touch runtime.
Read `node_modules/next/dist/docs/` before config edits (this fork differs from training data).

## Decisions locked — do not reopen

Public but unlisted (`noindex`) · GDPR/UK-GDPR + Serbian law (operator in Serbia) · 16+ ·
free · erasure by anonymise/block · Courses off · author nav hidden · legal pages public ·
rate limiting on signup + export only · **no cookie banner** (Sentry EU + cookieless analytics
keep this true — do not add a cookie-setting tool).

## Sequence and what's deferred

A ✅ → B0 ✅ → B content (DEFERRED, user authors later) → C legal ✅ → D erasure ✅ →
**E ops ← you are here** → F..N content → Z verification.

- Content deficit unchanged at **346 (176 hard)**; three subjects unplayable
  (`data_analysis`, `esports_history`, `trivium`). Independent of code; the user will author it.
- After E, the code path is done and only content (F..N) + release verification (Z) remain.

## Close-out (required — plan §6 working rule)

1. Tick Section D (+ E.3) items in `docs/release/definition-of-ready-1.0.md`; annotate step 5
   in the plan file's §6.
2. Rewrite this file for the next session, archiving this copy as `03-erasure.md`.
3. Report to the user: steps done / left and the current content deficit number.

## Constraints

- **Next.js 16.** `next lint` does not exist; gate is `npm run check`. Middleware is `proxy.ts`.
- `scripts/**`, `lib/**`, `app/(legal)/**` **are** linted; `app/components/ui/**` and
  `app/components/figma/**` are not.
- Design fidelity rules in `CLAUDE.md` are binding; record any new deviation there.
- `.sql` under `supabase/migrations/` is confirmed with the user before pushing.
- A stray `.mts`/`.ts` verification script belongs in the scratchpad or repo root and must be
  deleted after — do not leave it in `scripts/` (it is linted and would need its own types).
