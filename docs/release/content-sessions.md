# Content sessions — 1.0

**Complete.** All sessions F–N are done; [`content-gap.json`](./content-gap.json) (generated
2026-08-29, refreshed after Session N) reports **0 questions deficit, 0 subjects unplayable,
0 prompt files remaining**. Every subject in scope for 1.0 is at or above the 30/difficulty
target. This file is kept as the historical record of the sequence; target was **30 per
difficulty**, basis `approved` + `shared`. Difficulty spread is written **E / M / H**
(easy / medium / hard).

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
| **G** | Trivium | — | 0 | **Done.** Imported (`session_g_trivium.json`, 59 questions); deficit now 0/0/0. Registered 6 more subtopics (Film and Television, Sport, Transport, Fashion and Textiles, Measurement and Timekeeping, Customs and Celebrations) |
| **H** | Esports History | — | 0 | **Done.** Imported (`session_h_esports_history.json`, 49 questions); deficit now 0/0/0 |
| **I** | Science History | — | 0 | **Done.** Imported (`session_i_science_history.json`, 45 questions); deficit now 0/0/0. Registered 11 field-based subtopics (Astronomy, Physics, Chemistry, Medicine, Evolution, Genetics, Earth Sciences, Scientific Institutions, Biology, Mathematics, Optics) alongside the existing era-based ones |
| **J** | Music | — | 0 | **Done.** Imported (`session_j_music.json`, 30 questions); deficit now 0/0/0. Registered 10 new subtopics (Notation, Performance Practice, Instruments, Rhythm and Meter, Jazz, Modes, Musical Form, Counterpoint, Tuning and Acoustics, Twentieth Century Music) |
| **K** | Physics | — | 0 | **Done.** Imported (`session_k_physics.json`, 26 questions); deficit now 0/0/0. Registered 2 new subtopics (Fluid Mechanics, Quantum Mechanics) |
| **L** | Chemistry | — | 0 | **Done.** Imported (`session_l_chemistry.json`, 20 questions); deficit now 0/0/0. Registered 14 new subtopics (Periodic Table, Acids and Bases, Stoichiometry, Organic Reaction Mechanisms, Aromaticity, Chemical Equilibrium, Thermodynamics, Solubility, Molecular Structure, Coordination Chemistry, Stereochemistry, Solutions, Redox Chemistry, Chemical Kinetics) alongside the existing subfield-based ones |
| **M** | Mathematics | — | 0 | **Done.** Imported (`session_m_mathematics.json`, 16 questions); deficit now 0/0/0. Registered 8 new subtopics (Arithmetic, Set Theory, Analysis, Abstract Algebra, Probability, Mathematical Logic, Topology, Complex Analysis) |
| **N** | Literature + Computer Science | — | 0 | **Done.** Imported (`session_n_literature_cs.json`, 16 questions: 14 literature + 2 computer_science); deficit now 0/0/0. Registered 8 new Literature subtopics (Poetic Form, Narrative Technique, Literary Criticism, Modernism, Classical Literature, Genre, Romanticism, Medieval Literature) and 1 new Computer Science subtopic (Theory of Computation) |
| — | **Total remaining** | — | **0** | of which **0 hard** |

## Working notes

- **Every subject is now at or above the 30/difficulty target.** F–N (Data Analysis, Trivium,
  Esports History, Science History, Music, Physics, Chemistry, Mathematics, Literature +
  Computer Science) are all done. `build-content-prompts.ts` reports 0 deficit and writes no
  prompt files — there is nothing left to author for 1.0 content under this plan.
- If new deficits appear later (a target change, a new subject, content review removing rows),
  re-run `npx tsx --env-file=.env.local scripts/build-content-prompts.ts` to regenerate the
  prompts and pick the sequence back up.
- Import each batch with the `import-question-batch` skill.
