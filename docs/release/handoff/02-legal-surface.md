# Handoff → Session D (right to erasure)

_Written at the close of **Session C** (legal surface), 2026-08-29. Overwrite this file at
the close of each session; the previous copy is archived as `01-content-triage.md` in this
directory._

**Paste this whole file into a fresh session to start.**

---

## Session C closed — what landed

The public legal surface is built and verified locally.

| File | What it is |
| --- | --- |
| `docs/release/legal/{privacy-policy,terms-of-service,subprocessors}.md` | Placeholders filled (see below). These stay the **single source of truth** |
| `lib/legalDoc.tsx` | **New.** A small markdown-**subset** renderer (headings, paragraphs, GFM tables, lists, bold/italic/code, links, bare URLs, `---`). NOT a general engine — do not grow it. No markdown npm dependency. Drops `>` blockquotes on purpose (they are maintainer-only notes) |
| `app/(legal)/layout.tsx` | **New.** Public shell (logo → `/`, footer links), composed from existing AuthScreen/token classes |
| `app/(legal)/{terms,privacy,subprocessors}/page.tsx` | **New.** Each `readFileSync`s its `.md` and renders it; `export const dynamic = "force-static"` so the read happens at build, not runtime (Vercel-safe). `subprocessors` was added because the privacy policy links to it |
| `proxy.ts` | New `publicRoutes = ['/terms','/privacy','/subprocessors']`, returns early after the session refresh, kept **separate** from `authRoutes` |
| `app/(auth)/AuthScreen.tsx` | Register-mode clickwrap: required 16+/Terms consent checkbox (gated in `handleSubmit`) + an OAuth consent-by-action note under the Google/Discord buttons |
| `app/(main)/settings/SettingsView.tsx` | Terms/Privacy links at the bottom of the Data and privacy section |
| `supabase/migrations/036_terms_acceptance.sql` | **New, NOT YET PUSHED.** Adds `profiles.terms_accepted_at` + `terms_version`, stamped by `handle_new_user()` for every new profile |
| `CLAUDE.md` | Two new deviation entries (legal surface; AuthScreen clickwrap reversing the 2026-07-06 removal) |

**Placeholders resolved (from the user):** controller **Gleb Chernov**, country **Serbia**,
contact **privacy@colloquiz.app**, Supabase region **Ireland (`eu-west-1`)** (confirmed via
the Management API). Serbia is outside the EU/UK: GDPR still applies via Art. 3(2), governing
law is **Serbian law** (ToS §11), and the transfer wording now covers the operator's location.

**Verified locally** (dev server): `/terms`, `/privacy`, `/subprocessors` all return **200
signed out** (previously 307 → `/login`); the maintainer blockquotes are stripped; internal
`.md` links rewrite to routes; all tables render (privacy 5, subprocessors 3); the signup page
ships the consent checkbox + OAuth note; no `[PLACEHOLDER]` leaks into the HTML.

### Two things the next session must know

1. **Migration 036 is written but NOT pushed.** Confirm the SQL with the user, then
   `npx supabase db push` (or run it in the SQL Editor). Until then, new signups will still
   run the **004** version of `handle_new_user()` and won't record consent (the columns won't
   exist). Session D adds its own migration; you can push both together.
2. **No column GRANT was added for the two new columns — this is deliberate**, a reasoned
   deviation from the checklist's original wording. `handle_new_user()` is `SECURITY DEFINER`
   and bypasses the 006 allow-list; nothing writes these columns from a user session. Adding a
   GRANT would only let a user rewrite their own consent timestamp. If Session D or later adds
   a client-side re-consent write, add the GRANT then.

## State at close

- `npm run check` (`tsc --noEmit && eslint .`) — **clean**.
- `npm test` — **85 pass / 1 fail**, the SAME pre-existing stale test
  (`lib/courseContent.test.ts` › "embedded newline is rejected", contradicts commit
  `e82c3aa`). Session C did not touch it; it is fixed in **Session E** before wiring CI.
- Highest migration on disk: **`036_terms_acceptance.sql`** (035 was the last applied; **036
  is unpushed**).
- **Nothing is committed.** The whole 1.0 tree (Session A artifacts, Session C code, ADR 0002,
  `docs/release/**`) is uncommitted, alongside the large pre-existing Courses changeset. No
  code path visible to production users has changed yet.

## Your task — Session D (right to erasure)

Build account deletion by **anonymisation, not row deletion**. The design is fully decided in
**[`docs/adr/0002-account-erasure.md`](../../adr/0002-account-erasure.md)** — read it; do not
re-open it. Live checklist section: **B · Right to erasure** in
`docs/release/definition-of-ready-1.0.md`.

The export half already ships (`GET /api/account/export`, `lib/accountExport.ts`,
`settings/DataPrivacySection.tsx`) — **mirror it**.

1. **Group-ownership transfer is a prerequisite** (ADR §"Group ownership"). Decision is
   already locked: **block, do not auto-transfer.** If the caller owns a group that still has
   other members, `delete_my_account()` raises a distinct error; the UI names the groups and
   links to them. Groups where the caller is the only member are deleted normally. Check the
   `groups` schema (migration `014_groups.sql`) for the ownership/membership shape before
   writing the RPC.
2. **Migration** (037): `profiles.deleted_at timestamptz` + a `SECURITY DEFINER`
   `delete_my_account()` that in one transaction: nulls `full_name`/`city`, sets
   `display_name` → `'Deleted user'`, nulls `avatar_url`, deletes the avatar object from the
   `avatars` bucket, sets `deleted_at`, opts out of leaderboards, deletes `notifications` /
   `notification_preferences` / `quiz_sessions`, and **leaves** `results` / authored
   `questions` / `quizzes` / group content in place. Confirm SQL with the user before pushing.
3. **Ban, don't hard-delete the auth row** (six FKs to `profiles` block a real delete — ADR
   table). Revoke sessions and disable sign-in via a service-role admin call in the route
   handler, **only after** the anonymise transaction succeeds.
4. `POST /api/account/delete` — **no caller-supplied input**, JWT is the only selector, mirror
   the export route's discipline.
5. **Leaderboard / public-name queries must exclude `deleted_at IS NOT NULL`** — grep for
   every read of `display_name` on public surfaces (leaderboard, groups roster, duels) and add
   the filter.
6. **UI**: destructive block at the bottom of `DataPrivacySection.tsx` behind a type-the-word
   confirm dialog (pattern in `MyQuizzesView.tsx`), export offered first. Record the deviation
   in `CLAUDE.md`.

Verify on a throwaway account (`verify` skill): export → delete → profile anonymised, avatar
object gone, leaderboard no longer names them, a co-member's own history intact, sign-in fails.

## Decisions locked — do not reopen

Public but unlisted (`noindex`) · GDPR/UK-GDPR baseline + Serbian law (operator in Serbia) ·
16+ only · free · content bar ≥30/difficulty for the 16 subjects with content · erasure by
**anonymise, block owners of populated groups** (ADR 0002) · Courses stays off · author/tutor
nav hidden · legal pages are public routes · rate limiting on signup + export only · **no
cookie banner**.

## Sequence and what's deferred

Plan §6: A ✅ → B0 ✅ → **B content triage — DEFERRED (user will generate content later)** →
**C legal ✅ → D erasure ← you are here** → E ops → F..N content → Z verification.

- **Session B (content) is skipped for now at the user's request** — they will author the
  batches. It is independent of the code path. Still open when it runs: `esports_history` has a
  single subtopic (`Counter Strike`) and needs 60 questions; adding subtopics to
  `data/subjects.json` is the recommended fix. Live deficit unchanged at **346 (176 hard)**,
  three subjects unplayable (`data_analysis`, `esports_history`, `trivium`).
- **Session E (ops)** follows D: error boundaries (none exist today), Sentry, Vercel Analytics,
  CI, `robots.ts` (`noindex`), metadata, security headers + CSP, **and** the stale-test fix
  above.

## Close-out (required — plan §6 working rule)

1. Tick the Section B items you clear in `docs/release/definition-of-ready-1.0.md` and
   annotate step 4 in the plan file's §6 with `DONE (date)` / `BLOCKED — reason`.
2. Rewrite this file for Session E, archiving this copy as `02-legal-surface.md`.
3. Report to the user: steps done / left, and the current content deficit number.

## Constraints

- **Next.js 16.** `next lint` does not exist; the gate is `npm run check`. Middleware is
  `proxy.ts`. Read `node_modules/next/dist/docs/` before writing app code.
- `scripts/**` and `lib/**` and `app/(legal)/**` **are** linted; `app/components/ui/**` and
  `app/components/figma/**` are not.
- Design fidelity rules in `CLAUDE.md` are binding: compose from classes already in use, and
  record any new deviation there.
- `.sql` under `supabase/migrations/` is confirmed with the user before pushing; import
  scripts are run directly.
