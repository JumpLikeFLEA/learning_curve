# ADR 0002 — Account erasure by anonymisation, not deletion

**Status:** Accepted, 2026-08-28
**Owner:** 1.0 release / data protection

## Context

Colloquiz launches to EU/EEA and UK users, so GDPR Art. 17 (right to erasure)
applies. Settings › Data and privacy already ships the *access and portability*
half — `GET /api/account/export` streams a JSON document assembled by the pure
`lib/accountExport.ts`. The erasure half renders nothing at all, deliberately:
`app/(main)/settings/DataPrivacySection.tsx` carries a comment saying deletion is
blocked on a decision about content other users depend on.

That block is real, and it has two independent causes.

**Deleting an auth user fails today.** Six foreign keys point at `profiles` with
no `ON DELETE` action, so Postgres refuses the delete outright:

| Column | Table |
| --- | --- |
| `user_id` | `results` |
| `created_by` | `questions` |
| `reviewed_by` | `questions` |
| `created_by` | `quizzes` |
| `created_by` | `generation_batches` |
| `resolved_by` | `question_reports` |

**Making them cascade would be worse.** `groups.owner_id` is already
`ON DELETE CASCADE`, and it chains onward: deleting a group owner destroys the
group, which cascades through `questions.group_id` and `quizzes.group_id` into
`results`. A user deleting their own account would silently erase *other
members'* quiz history. Art. 17 gives a person control over their own data, not
over everyone else's.

So the choice is not "how do we cascade" but "what does erasure mean here".

## Decision

**Erase the person, keep the record — anonymised.**

`delete_my_account()`, a `SECURITY DEFINER` RPC called from
`POST /api/account/delete`, does the following in one transaction:

- overwrite `profiles.full_name`, `city` → `NULL`; `display_name` →
  `'Deleted user'`; `avatar_url` → `NULL`;
- delete the avatar object from the `avatars` storage bucket;
- set `profiles.deleted_at`;
- opt the account out of every leaderboard;
- delete `notifications`, `notification_preferences` and any `quiz_sessions`;
- **leave** `results`, authored `questions` / `quizzes` and group content in
  place, now attributable to nobody.

Then the account is closed: sessions are revoked and sign-in is disabled. The row
in `auth.users` is **banned, not deleted**, because the six FKs above still point
at the profile and a hard delete would fail. This is an implementation
consequence, not a promise to the user — from the user's side the account is gone
and their identity is erased.

Anonymised quiz records are no longer personal data, so retaining them is
compatible with Art. 17 and Art. 89. The Privacy Policy says this in plain words
rather than hiding it (§9 of `docs/release/legal/privacy-policy.md`): *"we retain
your quiz results and any questions or quizzes you contributed, in anonymised
form, with no link back to you."* A policy that claimed total deletion would be
false.

### Group ownership

A user who owns a group with other members cannot simply vanish — the group would
be ownerless, and the existing cascade would take the members' content with it.

**Decision: block, do not auto-transfer.** If the caller owns a group that still
has other members, `delete_my_account()` raises a distinct error and the UI names
the groups and links to them, telling the user to transfer ownership or remove the
members first. Groups where the caller is the only member are deleted normally.

Auto-transferring to "the longest-standing admin" was considered and rejected:
it hands someone a group they never asked to own, and it does so during an
irreversible operation the user is not watching. An explicit hand-off is one more
step for a rare case, and it is the honest one. Group ownership transfer is
therefore a prerequisite of this work, not a follow-up.

### Route shape

`POST /api/account/delete` takes **no caller-supplied input** — no params, no
body — exactly as the export route does. The caller's own JWT is the only thing
that selects rows; RLS and `auth.uid()` inside the `SECURITY DEFINER` function are
the scoping boundary. There is nothing to forge.

The UI is a destructive block at the bottom of `DataPrivacySection.tsx`, behind a
type-the-word confirmation dialog following the existing pattern in
`MyQuizzesView.tsx`, and it points at the export control first — "download your
data before you go" is the right ordering.

## Consequences

- Art. 17 is satisfied without a schema redesign, and no user can destroy another
  user's history.
- The `auth.users` row survives as a banned shell. Its email is still in the auth
  table, so a full erasure request by email needs an operator step. **This is the
  one gap**, and it is why `[CONTACT EMAIL]` in the Privacy Policy is not
  decorative.
- Users who own populated groups hit a wall the first time. Accepted: it is rare,
  the message is specific, and the alternative silently reassigns other people's
  content.
- `deleted_at` becomes a column every user-facing query should be aware of.
  Leaderboards and public-name lookups must exclude it.
- A future hard delete stays open: redesign the six FKs to `ON DELETE SET NULL`
  and break the `groups.owner_id` cascade, then delete the auth row. Tracked as a
  1.2 item — this ADR is what it would supersede.

## Alternatives rejected

**Manual erasure on request only.** Legally acceptable — Art. 17 does not require
a self-serve button — but it makes every deletion an operator task with a
one-month clock, and a settings page that offers export but not deletion reads as
evasive.

**Full hard delete now.** Correct in principle; it means redesigning six FKs and
the group cascade before launch, with a real risk of destroying content while
getting it wrong. Deferred to 1.2 with this ADR as the interim.

**Cascade everything.** Rejected outright: one user's deletion would erase other
users' quiz histories.
