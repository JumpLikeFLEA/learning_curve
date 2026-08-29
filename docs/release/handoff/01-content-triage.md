# Handoff → Session B (content triage)

_Written at the close of **Session A** (artifacts) and updated at the close of
**Session B0** (blockers & hygiene), both 2026-08-28. Overwrite this file at the close of
each session; archive the previous copy as `<NN>-<step>.md` in this directory._

## Session B0 closed — what changed since Session A

Done and verified: Supabase Auth URL config was **already correct**; the stale
`learning-curve-beta.vercel.app/**` redirect entry was removed from the allow-list;
`password_min_length` raised 6 → 8 (matched to the client's existing `minLength={8}`);
`BENCH_PASSWORD` rotated to a 32-char random value with old-password rejection verified;
`.env.local.example` scrubbed to placeholders; `app/(main).rar` and `app/components.rar`
removed (staged, uncommitted); `/authored` snapshotted to
`C:\Users\PC\Backups\colloquiz\authored-2026-08-28.zip`.

**Two items handed back to the user, both dashboard-only and still open:**

1. **Resend domain verification** — the last real launch blocker. Evidence says it is
   probably fine (custom sender `noreply@colloquiz.app` via `smtp.resend.com`, and a
   probe signup returned 200 with `confirmation_sent_at` set rather than an SMTP 500),
   but that is not proof of inbox delivery. Confirm at Resend → Domains.
2. **Revoke the second `SUPABASE_ACCESS_TOKEN`** at supabase.com/dashboard/account/tokens.

Also note: `.perf/prod-latest.json` was briefly overwritten by a 3-iteration verification
run and has been **restored** to the 20-iteration 2026-08-12 baseline.
`.perf/prod-report.md` is still the noisy 3-iter render and will be regenerated at the 1.0
baseline run — ignore it until then.

Production user count at close: **18**.

**Paste this whole file into a fresh session to start.**

---

## Where we are

Colloquiz is live at https://colloquiz.app but has none of the scaffolding of a released
product: no legal documents, no public surface, no right-to-erasure, no error boundaries,
no monitoring, no CI. The plan for 1.0 lives at
`C:\Users\PC\.claude\plans\help-me-to-prepare-tidy-bear.md`; the live checklist is
`docs/release/definition-of-ready-1.0.md`. **Read both before starting.**

Session sequence (plan §6): **A artifacts ✅ → B content triage ← you are here → C legal
surface → D erasure → E ops → F..N content → Z release verification.** Sessions C, D and E
are independent of the content work and can run in either order.

## What Session A landed

| File | What it is |
| --- | --- |
| `scripts/build-content-prompts.ts` | **New.** Regenerates the gap report and the prompt pack from the live bank. Run it after every import |
| `docs/release/content-gap.json` | Machine-readable per-subject counts, deficits, priority |
| `docs/release/prompts/*.md` (10) + `README.md` | Paste-ready authoring prompt per short subject |
| `docs/release/definition-of-ready-1.0.md` | The 1.0 checklist — the thing to tick |
| `docs/release/legal/privacy-policy.md` | Full GDPR draft, placeholders in `[BRACKETS]` |
| `docs/release/legal/terms-of-service.md` | Full draft, placeholders in `[BRACKETS]` |
| `docs/release/legal/subprocessors.md` | Processor table the policy links to |
| `docs/adr/0002-account-erasure.md` | The soft-delete decision and why |
| `docs/release/launch-checklist.md` | The dashboard/DNS steps that are not code |

**Nothing shipped to users.** No migration, no import, no code path changed. All of the
above is uncommitted in the working tree, alongside a large pre-existing uncommitted
Courses changeset.

State at close: `npm run check` **clean**; `npm test` **85 pass / 1 fail**; highest
migration `035_course_editor_read.sql`.

**The failing test is pre-existing and stale, not a defect.**
`lib/courseContent.test.ts` › "embedded newline is rejected" asserts that a prose block
with `\n` is rejected, but commit `e82c3aa` ("prose + example new lines") deliberately
changed `authoredString(1, { allowNewlines: true })` to accept newlines in prose, example
and callout bodies. The code is right; the test case was not updated with it. It is on the
1.0 checklist under Section D because a red suite blocks the CI gate — fix it there, not
in Session B.

## Decisions already locked — do not reopen

Public but unlisted launch (`noindex`) · GDPR/UK-GDPR baseline · **16+ only** · free, no
payments · content bar **≥30 per difficulty** for the 16 subjects that have content · the
4 empty subjects (`economics`, `art`, `languages`, `motion_design_and_video`) are **not**
filled · erasure by **anonymise, not delete** · Courses stays **off** · author/tutor nav
stays hidden · legal pages are **public routes** · authoring via **external LLM chat →
`authored/` → import script** · rate limiting on signup and export only · **no cookie
banner** (strictly-necessary cookies only).

One decision was made *during* Session A and written into ADR 0002, flagged here because
it is reversible: **a user who owns a group with other members is blocked from deleting
their account** (with a message naming the groups) rather than having ownership
auto-transferred. Group-ownership transfer therefore becomes a prerequisite of Session D.

## Live state (re-verify, do not assume — these move)

Bank: **2,783** questions, **16** subjects with content, **20** in the taxonomy.
Deficit to 30/30/30: **346 questions, 176 of them `hard`**. Three subjects are
**unplayable** at some difficulty (Quick Play needs ≥10 at the selected difficulty,
`QUIZ_SIZE` in `app/components/SubjectGrid.tsx`).

Refresh everything with one command:

```
npx tsx --env-file=.env.local scripts/build-content-prompts.ts
```

## Your task — Session B

Fix the three subjects that are **unplayable today**. Roughly 32 questions clears all
three at the 10-question Quick Play floor; the prompts ask for the full 30/30/30, which is
better if the batches come back clean.

| Subject | easy / med / hard | Unplayable at | Prompt |
| --- | --- | --- | --- |
| `data_analysis` | 27 / 0 / 0 | medium, hard | `docs/release/prompts/data_analysis.md` |
| `esports_history` | 20 / 10 / 0 | hard | `docs/release/prompts/esports_history.md` |
| `trivium` | 5 / 12 / 3 | easy, hard | `docs/release/prompts/trivium.md` |

**Loop, per subject:**

1. Open the prompt file, paste everything between the two `===` rules into a fresh LLM
   chat.
2. Save the returned JSON array to `authored/<today>/<subject>.json`.
3. Import:
   ```
   npx tsx --env-file=.env.local scripts/import-authored-questions.ts authored/<today>/<subject>.json --source ai_generated --status approved
   ```
4. Re-run `scripts/build-content-prompts.ts` and confirm the deficit fell.

The importer validates schema, taxonomy, KaTeX and duplicates and rejects the whole file
on any error, so a clean run is the acceptance test. Follow the project's
`import-question-batch` skill — it is the runbook, and it settles the recurring
non-issues: a new subject is standard procedure, inline scaffolding is stripped
automatically, and **options are shuffled at serve time so the correct answer sitting in
the same position is never a defect — do not reorder at import.**

### Open question for the user — answer before authoring `esports_history`

`esports_history` has **exactly one subtopic**, `Counter Strike`, and needs 60 more
questions including 30 hard. Thirty *hard* Counter-Strike-history questions that are not
strained trivia is a lot to ask. Options:

- **(recommended)** add subtopics to `data/subjects.json` — e.g. `Dota 2`,
  `League of Legends`, `StarCraft`, `Overwatch` — then regenerate the prompt. Editing
  `data/subjects.json` is static config and standard procedure, not a migration.
- keep the single subtopic and accept a thinner hard tier for now, fixing only the
  10-question floor.

`trivium` (6 subtopics) and `data_analysis` (6 subtopics) have enough breadth as they are.

## Close-out (required — plan §6 working rule)

Before ending the session:

1. Tick the Section C items you cleared in `docs/release/definition-of-ready-1.0.md`, and
   annotate step 2 in the plan file's §6 with `DONE (date)` or `BLOCKED — reason`.
2. Rewrite `docs/release/handoff/next-session.md` for the next step, after archiving this
   file as `docs/release/handoff/01-content-triage.md`. Include: what actually landed
   (real import counts, not intentions), what did not and why, the refreshed
   `get_subject_stats` numbers, the highest applied migration, whether
   `npm run check` / `npm test` were green, and any open question for the user.
3. Report progress to the user: steps done / left, and the current deficit number.

## Constraints

- **Next.js 16.** `next lint` does not exist; the gate is `npm run check`
  (`tsc --noEmit && eslint .`). Read `node_modules/next/dist/docs/` before writing app
  code — this fork differs from training data (middleware is `proxy.ts`).
- `scripts/**` **is** linted. `app/components/ui/**` and `app/components/figma/**` are not.
- Design fidelity rules in `CLAUDE.md` are binding: compose from classes already in use,
  and record any new deviation in the CLAUDE.md list.
- `.sql` under `supabase/migrations/` is confirmed with the user before pushing; import
  scripts are run directly.
