# Definition of Ready — Colloquiz 1.0

**Status:** in progress · Session A (artifacts) complete, 2026-08-28
**Launch shape:** public but unlisted — signups open, `noindex`, no marketing push
**Live now:** https://colloquiz.app (Vercel `dub1`) · ~2,783 questions · 16 subjects

1.0 is ready when every ☐ below is ☑. Anything not on this list is explicitly **not** a
1.0 gate — see §"Out of scope".

---

## Decisions (locked — do not re-litigate)

| Decision | Answer |
| --- | --- |
| Launch type | Public but unlisted, `noindex` |
| Legal regime | EU/EEA + UK, GDPR / UK-GDPR baseline |
| Minors | 13+ (self-serve) — ToS clause + signup age declaration; under-13 restricted accounts deferred to 1.1 |
| Money | Free at 1.0, no payment terms |
| Content bar | ≥30 approved+shared per difficulty, for the 16 subjects that have content |
| Empty subjects | `economics`, `art`, `languages`, `motion_design_and_video` left unfilled — already invisible in the grid |
| Right to erasure | Soft-delete / anonymise, built in 1.0 (see [ADR 0002](../adr/0002-account-erasure.md)) |
| Courses | `COURSES_ENABLED` stays `false`; ships in 1.1 |
| Author/tutor nav | Stays hidden (`SHOW_AUTHOR_NAV = false`) |
| Legal pages | Public routes `/terms` + `/privacy` |
| Authoring path | External LLM chat → `authored/` → import script |
| Rate limiting | Signup + account export only; rest to 1.1 |
| Cookie banner | **Not required** — only strictly-necessary cookies, cookieless analytics |

---

## 0 · Blockers cleared first (Session B0 — 2026-08-28)

- [x] **Supabase Auth URL configuration** — verified via the Management API, already
      correct: `site_url = https://colloquiz.app`, allow-list carries
      `https://colloquiz.app/**`
- [x] **Removed the stale `learning-curve-beta.vercel.app/**` redirect entry** — the
      pre-rebrand domain was still an allowed auth-code destination. Allow-list is now
      localhost + colloquiz.app only
- [x] **`password_min_length` 6 → 8** — matched to the client's existing
      `minLength={8}` (`AuthScreen.tsx:454`, `ResetPasswordScreen.tsx:78`). Set to 10
      first, which would have failed 9-character passwords server-side only; corrected
- [x] **Resend domain verification — CLEARED (user confirmed 2026-08-29).** The
      `colloquiz.app` domain is verified in Resend; the last real launch blocker is closed.
      Final re-check at release time still lives in §F
- [x] **`/authored` backup** — decided: stays gitignored, backed up separately. Snapshot
      at `C:\Users\PC\Backups\colloquiz\authored-2026-08-28.zip` (27 files, 142 KB);
      command in [`launch-checklist.md`](./launch-checklist.md). **Still to do: move a
      copy off this machine**

## A · Legal — DONE (Session C, 2026-08-29)

- [x] Recorded: `[CONTROLLER NAME]` = **Gleb Chernov**, `[COUNTRY]` = **Serbia**,
      `[CONTACT EMAIL]` = **privacy@colloquiz.app**. Note: Serbia is outside the EU/UK, so
      GDPR applies via Art. 3(2) (targeting EU/UK users), governing law is **Serbian law**
      (ToS §11), and the transfer basis wording now covers the operator's own location
- [x] Confirmed the Supabase project region via the Management API → **Ireland
      (`eu-west-1`)**; written into privacy §6 and the subprocessor table
- [x] Filled every placeholder in [`legal/privacy-policy.md`](./legal/privacy-policy.md)
- [x] Filled every placeholder in [`legal/terms-of-service.md`](./legal/terms-of-service.md)
- [x] Filled and verified [`legal/subprocessors.md`](./legal/subprocessors.md)
- [x] `app/(legal)/layout.tsx` — public shell, composed from existing AuthScreen classes
- [x] `app/(legal)/terms/page.tsx` + `app/(legal)/privacy/page.tsx` **+
      `subprocessors/page.tsx`** (added: the privacy policy links to it, so it needed a
      route). All three render the reviewed `.md` at build time (`force-static`) via
      `lib/legalDoc.tsx`, a small markdown-subset renderer — single source of truth, no
      markdown npm dependency
- [x] `proxy.ts` — new `publicRoutes` list (`/terms`, `/privacy`, `/subprocessors`),
      returns early after the session refresh; kept **separate** from `authRoutes`.
      Verified locally: all three return **200 signed out**, not a 307 to `/login`
- [x] Signup clickwrap in `app/(auth)/AuthScreen.tsx` — required 13+/Terms consent
      checkbox in register mode (gated in `handleSubmit`) + an OAuth consent-by-action
      note under the Google/Discord buttons. **Age floor lowered 16 → 13 on 2026-09-01**
      (see the *Minors* decision row)
- [x] Migration `036_terms_acceptance.sql`: `profiles.terms_accepted_at` + `terms_version`,
      stamped by `handle_new_user()` on every new profile. **NO column GRANT was added**
      (a reasoned deviation from this line's original wording): the trigger is
      `SECURITY DEFINER` and bypasses the 006 allow-list, and nothing writes these columns
      from a user session, so a GRANT would only let a user rewrite their own consent
      timestamp. **APPLIED to prod 2026-08-29** (verified: new signups stamp
      `terms_accepted_at` + `terms_version = '1.0'`).
- [x] Links to both pages from Settings (Data and privacy section) and the auth screen
- [x] Recorded two new intentional deviations in `CLAUDE.md` (the legal surface, and the
      AuthScreen clickwrap reversing the 2026-07-06 entry)

## B · Right to erasure — DONE (Session D, 2026-08-29, migration 037 APPLIED)

- [x] Group ownership: **block, not transfer** (ADR 0002). `delete_my_account()` returns
      `{ok:false, reason:'owns_groups', groups:[…]}` and makes no change when the caller
      owns a group with other members. No transfer code — that was rejected in the ADR
- [x] Migration `037_account_deletion.sql`: `profiles.deleted_at` + `delete_my_account()`
      `SECURITY DEFINER` RPC (returns JSONB). Applied and verified in prod
- [x] Avatar object removed from the `avatars` bucket on delete — service-role
      `storage.from('avatars').list/remove` in the route handler
- [x] Leaderboard queries exclude `deleted_at` — `deleted_at IS NULL` added to
      `get_leaderboard`, `get_my_rank`, `get_competitive_leaderboard` (belt-and-braces over
      the `leaderboard_opt_out` the RPC also sets). Group roster/duel surfaces intentionally
      still show "Deleted user" — a past member is not hidden, just de-identified
- [x] `POST /api/account/delete` — no caller-supplied input, mirrors the export route; JWT
      is the only selector. Bans the auth user with the service role (ban, not delete — the
      six FKs forbid delete)
- [x] Destructive UI block in `settings/DataPrivacySection.tsx` — danger-zone card below the
      export, type-`DELETE` confirm dialog, export offered first
- [x] Error path when the caller owns a populated group: the dialog names each group and
      links to `/groups/[id]`
- [x] **Verified end-to-end on throwaway accounts** (15/15 assertions): block path, anonymise
      (display_name→'Deleted user', name/city/avatar nulled, deleted_at + opt_out set), solo
      group deleted, other member's group survives, and sign-in rejected after ban
      ("User is banned"). `lib/supabase/admin.ts` is the first service-role client (server-only)

## C · Content — 30 per difficulty — DONE (2026-08-29)

Deficit at session A was **346 questions, 176 of them `hard`**; it is now **0**. Regenerate
with `npx tsx --env-file=.env.local scripts/build-content-prompts.ts`; live state lives in
[`content-gap.json`](./content-gap.json), prompts in [`prompts/`](./prompts/README.md).

Per the regenerated [`content-gap.json`](./content-gap.json) (2026-08-29 21:56):
`deficit_total: 0`, `deficit_hard: 0`, `subjects_broken: 0`.

**Formerly unplayable — now cleared:**

- [x] `data_analysis` — 34 / 34 / 33
- [x] `esports_history` — 30 / 30 / 30 (subtopics expanded in `data/subjects.json`:
      Counter Strike, Dota 2, StarCraft, League of Legends)
- [x] `trivium` — 30 / 30 / 30

**Formerly thin — now at ≥30/30/30:**

- [x] `science_history` · [x] `music` · [x] `physics` · [x] `chemistry` ·
      [x] `mathematics` · [x] `literature` · [x] `computer_science`
- [x] Final check: no subject under 30 at any difficulty (all 16 content subjects pass)

## D · Ops and resilience — DONE (Session E, 2026-08-29)

- [x] `app/global-error.tsx`, `app/not-found.tsx`, `app/(main)/error.tsx`,
      `app/(auth)/error.tsx` — all four added. `global-error` is inline-styled (it
      replaces the root layout, so no globals/ThemeProvider); the rest compose from the
      card/border/destructive tokens and the `ErrorDialog` copy voice
- [x] Sentry (server + client + edge) — `sentry.server.config.ts`,
      `sentry.edge.config.ts`, `instrumentation-client.ts`, `instrumentation.ts`
      (`register()` + `onRequestError`), `withSentryConfig` in `next.config.ts`. PII
      scrubbed by `lib/sentryScrub.ts` (whole cookie jar + Cookie/Authorization/`sb-*`
      headers + email + IP) wired into every `beforeSend`; `sendDefaultPii` off. **Inert
      without `NEXT_PUBLIC_SENTRY_DSN`** — create the project in the EU region and set the
      DSN (+ `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN` for source-map upload)
- [x] Vercel Analytics + Speed Insights — `<Analytics />` + `<SpeedInsights />` in
      `app/layout.tsx` (cookieless)
- [x] **Stale test fixed** — `lib/courseContent.test.ts`: the newline rejection now
      targets single-line fields (formula body, list item), and positive prose/callout
      newline cases were added. Suite is **93/93 green** (incl. new `lib/sentryScrub.test.ts`)
- [x] `.github/workflows/ci.yml` — `npm ci`, `npm run check`, `npm test` on push + PR
      (build stays out; it needs the Supabase env and belongs to §F)
- [x] `app/robots.ts` returning site-wide `disallow` (noindex), `/robots.txt` added to
      the proxy `publicRoutes`. Verified in `next build` (`○ /robots.txt`)
- [x] `app/layout.tsx` metadata — `metadataBase`, title template, `robots` off,
      OpenGraph + Twitter. `app/icon.tsx`, `app/apple-icon.tsx`, `app/opengraph-image.tsx`
      generate the brand images via `next/og` (identity in `lib/site.ts`)
- [x] Removed the stock Next.js SVGs from `public/` (`file/globe/next/vercel/window.svg`,
      all unreferenced)
- [ ] **Confirm Supabase Auth's own signup/email rate limits in the dashboard** (manual —
      do not rebuild them). The only remaining Section D item; not code
- [x] Rate-limit `/api/account/export` — migration `038_account_export_rate_limit.sql`
      (a log table + BEFORE INSERT trigger raising `PT429`, mirroring `feedback_rate_limit`)
      + route logs-and-counts before the reads and returns a 429 with `Retry-After`.
      **Migration APPLIED to prod 2026-08-29**

## E · Security and hygiene

- [x] **Rotate `BENCH_PASSWORD`** — done 2026-08-28. 32-char random value; sign-in with
      the new password verified OK, sign-in with `bench123` verified rejected (400);
      `.env.local` updated and `npm run bench --target=prod` re-authenticated cleanly
- [x] **Scrub `.env.local.example` back to placeholders** — done 2026-08-28. It had held a
      complete working credential set. Original saved to the session scratchpad
- [x] **Remove the `.rar` files** — done 2026-08-28, `git rm --cached` + deleted from
      disk; staged, not yet committed. Verified unreferenced anywhere in the codebase
- [x] **Revoke the second `SUPABASE_ACCESS_TOKEN`** — done (user confirmed 2026-08-29).
      The second full-access management token that existed only in the example file has
      been revoked at supabase.com/dashboard/account/tokens
- [x] Security headers in `next.config.ts` (Session E, 2026-08-29): `poweredByHeader:
      false`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
      `X-Content-Type-Options: nosniff`, `Permissions-Policy` (camera/mic/geolocation/
      browsing-topics off), via `async headers()`
- [x] CSP — **report-only** (`Content-Security-Policy-Report-Only`), no nonces (keeps
      static/streamed rendering; `'unsafe-inline'` covers the framework + next-themes
      inline scripts). Allows Supabase REST+wss, Sentry ingest and the Vercel analytics
      script/beacon; Supabase host for avatars. Verified in `next build`. **Tighten to
      enforcing (drop report-only, remove `'unsafe-inline'` via nonces or hashes) once a
      window of real traffic shows no violations**
- [ ] Decide the fate of `/authored` (gitignored — the corpus exists only on one machine
      and in the DB): commit it, or back it up durably
- [ ] Confirm Supabase backup / PITR retention on the current plan

## F · Release verification

- [ ] `npm run check` · `npm test` · `next build` all clean
- [ ] **Resend domain verified** — it was in test mode as of 2026-07-18, delivering only
      to the operator's address. If unverified, **nobody can confirm a signup**
- [ ] Supabase Auth → URL Configuration lists the production Site URL and
      `https://colloquiz.app/**` redirect glob, not just localhost
- [ ] Full manual pass on a fresh throwaway account (`verify` skill): signup → email
      confirm → quick play at each difficulty → results → progress/history → achievements
      → settings (avatar, notifications, export, **delete**) → group create/join → duel →
      password reset
- [ ] `curl -I https://colloquiz.app/terms` → 200, both signed out and signed in
- [ ] `npm run bench -- --target=prod` recorded as the 1.0 baseline. Known standing
      issues: `/dashboard` p50 ≈ 422 ms, `/achievements` ≈ 415 ms (budget 400 ms)
- [ ] Tag `v1.0.0`

---

## Out of scope for 1.0 (a decision, not an oversight)

Courses (built, dark) · author/tutor nav (built, dark) · marketing/landing page · SEO
indexing · account **hard** delete · transactional email beyond Supabase Auth · payments ·
E2E and component tests · rate limiting beyond signup and export · cookie banner ·
filling the four empty subjects.

**Under-13 restricted accounts (deferred to 1.1).** 1.0's self-serve floor is 13. A
Quizlet-style under-13 experience — a restricted "Child Account" gated behind **verifiable
parental consent** (capture a parent's email, an email consent round-trip, features gated
off, a parent request channel) — is a feature build, not a doc edit, and pulls **US COPPA**
into a product currently scoped to EU/UK + Serbian law. Out of scope for 1.0 on purpose;
do not promise it in the public Terms or Privacy Policy.
