# Content sessions — 1.0

Maps the remaining question deficit onto work sessions. Numbers are the live deficits from
[`content-gap.json`](./content-gap.json) (generated 2026-08-29; target **30 per difficulty**,
basis `approved` + `shared`). Difficulty spread is written **E / M / H** (easy / medium / hard).

The external LLM already has the authoring instructions baked into its skill, so each prompt
is just **subject · count · difficulty spread** — nothing else needs restating.

> **Content spans two phases.** **Session B** was the *triage* pass — the ~32 questions that
> lift the three unplayable subjects (`data_analysis`, `esports_history`, `trivium`) above the
> 10-question floor so they become playable at all. **Sessions F–N** below then bring every
> thin/broken subject the rest of the way to 30/difficulty. B is deferred (the user authors
> content); F–N complete it. The broken subjects therefore appear here at their *full* remaining
> deficit — triage is a subset of the same work, not separate content.

The four empty subjects (`economics`, `art`, `languages`, `motion_design_and_video`) are
**out of scope for 1.0** — deliberately unfilled and already invisible in the grid.

## Sessions

| Session | Area of generation | Short prompt (subject · count · spread) | Total | Notes |
| --- | --- | --- | --- | --- |
| **F** | Data Analysis | — | 0 | **Done.** Imported (`session_f_data_analysis.json`, 63 questions); deficit now 0/0/0 |
| **G** | Trivium | Trivium — E 21 · M 14 · H 24 | 59 | **Broken** at easy + hard. General-knowledge mix across its (now 12) subtopics |
| **H** | Esports History | Esports History — E 6 · M 16 · H 27 | 49 | **Broken** at hard. No longer blocked on subtopics — Dota 2, StarCraft and League of Legends were registered alongside Counter Strike in Session B |
| **I** | Science History | Science History — E 15 · M 15 · H 15 | 45 | Thin, even split |
| **J** | Music | Music — E 6 · M 6 · H 18 | 30 | Thin, hard-heavy |
| **K** | Physics | Physics — E 6 · M 6 · H 14 | 26 | Thin, hard-heavy |
| **L** | Chemistry | Chemistry — E 2 · M 2 · H 16 | 20 | Thin, hard-heavy |
| **M** | Mathematics | Mathematics — E 6 · M 0 · H 10 | 16 | Thin; medium already met |
| **N** | Literature + Computer Science | Literature — H 14 · · Computer Science — H 2 | 16 | Two hard-only tails folded into one session to fit F–N |
| — | **Total remaining** | — | **261** | of which **140 hard** |

## Working notes

- **Do G–H next.** Trivium and Esports History are still below the 10-question floor at one or
  more difficulties (Data Analysis / Session F is done); clearing them restores full catalogue
  availability.
- After **every** import, re-run
  `npx tsx --env-file=.env.local scripts/build-content-prompts.ts` — the deficits and the
  do-not-repeat lists shift, so the counts above are a starting snapshot, not fixed quotas.
- Import each batch with the `import-question-batch` skill.
