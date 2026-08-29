/**
 * Builds the 1.0 content-gap report and the per-subject authoring prompt pack.
 *
 *   npx tsx --env-file=.env.local scripts/build-content-prompts.ts
 *
 * Two outputs, both regenerable — re-run this after every import to see the gap
 * shrink:
 *
 *   docs/release/content-gap.json        machine-readable state of the bank
 *   docs/release/prompts/<subject>.md    one paste-ready prompt per short subject
 *
 * The prompt bodies are docs/instruction_external_LLM.txt with the taxonomy
 * placeholder on line 90 filled in for ONE subject, plus a per-difficulty quota
 * and the existing stems at the short difficulties so the model does not
 * re-author what the bank already holds.
 *
 * Reads the live bank with the ANON key, so RLS applies and the counts are
 * exactly what a learner would see — the same basis as lib/questions.ts
 * getSubjectStats(): status 'approved' and visibility 'shared' only.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { slugifyForTag } from "../lib/utils";
import type { Subject } from "../types";

/** The 1.0 Definition of Ready floor: this many questions at EACH difficulty. */
const TARGET_PER_DIFFICULTY = 30;

/** Quick Play always asks for a 10-question quiz (SubjectGrid.tsx QUIZ_SIZE). */
const QUIZ_SIZE = 10;

const DIFFICULTIES = ["easy", "medium", "hard"] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

/** Longest stem excerpt written into a prompt's "already covered" list. */
const STEM_EXCERPT = 100;

const ROOT = join(import.meta.dirname, "..");
const OUT_DIR = join(ROOT, "docs", "release");
const PROMPT_DIR = join(OUT_DIR, "prompts");

type StatRow = { subject: string; difficulty: Difficulty; cnt: number };
/**
 * `questions` has no `subtopic` column — the subtopic is stored slugified in
 * `tags` (`slugifyForTag`, i.e. lowercased and whitespace-collapsed), so the
 * label is recovered by matching a tag back against the taxonomy.
 */
type StemRow = { question: string; tags: string[] | null; difficulty: Difficulty };

type SubjectGap = {
  id: string;
  name: string;
  counts: Record<Difficulty, number>;
  total: number;
  deficit: Record<Difficulty, number>;
  deficitTotal: number;
  /** broken = below the 10-question Quick Play floor somewhere; thin = below target. */
  priority: "broken" | "thin" | "ok";
  brokenAt: Difficulty[];
  subtopics: string[];
};

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Run with: npx tsx --env-file=.env.local scripts/build-content-prompts.ts`,
    );
  }
  return value;
}

async function rpc<T>(name: string): Promise<T> {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  if (!res.ok) throw new Error(`RPC ${name} → ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

/** PostgREST caps a response at 1000 rows; walk it with Range headers. */
async function fetchStems(subject: string): Promise<StemRow[]> {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const out: StemRow[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const res = await fetch(
      `${url}/rest/v1/questions?select=question,tags,difficulty` +
        `&subject=eq.${subject}&status=eq.approved&visibility=eq.shared`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Range: `${from}-${from + page - 1}`,
        },
      },
    );
    if (!res.ok) throw new Error(`stems ${subject} → ${res.status} ${await res.text()}`);
    const rows = (await res.json()) as StemRow[];
    out.push(...rows);
    if (rows.length < page) return out;
  }
}

function excerpt(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= STEM_EXCERPT ? flat : `${flat.slice(0, STEM_EXCERPT - 1)}…`;
}

function buildPrompt(gap: SubjectGap, stems: StemRow[], instruction: string): string {
  const short = DIFFICULTIES.filter(d => gap.deficit[d] > 0);

  // Only the short difficulties need a "do not repeat" list — a difficulty that
  // is already at target is not being authored, so its stems are noise.
  const relevant = stems.filter(s => short.includes(s.difficulty));

  // Recover the Title Case label from the slugified tag, so the coverage list
  // uses exactly the strings the importer will accept.
  const labelBySlug = new Map(gap.subtopics.map(s => [slugifyForTag(s), s]));
  const bySubtopic = new Map<string, number>();
  for (const row of stems) {
    const label = (row.tags ?? [])
      .map(tag => labelBySlug.get(tag))
      .find((l): l is string => Boolean(l));
    const key = label ?? "(unmapped)";
    bySubtopic.set(key, (bySubtopic.get(key) ?? 0) + 1);
  }

  const quota = short.map(d => `${gap.deficit[d]} ${d}`).join(", ");
  const taxonomy = `${gap.id} → ${gap.subtopics.join(", ")}`;

  const unmapped = bySubtopic.get("(unmapped)") ?? 0;
  const coverage =
    gap.subtopics
      .map(s => `- ${s} — ${bySubtopic.get(s) ?? 0} existing`)
      .join("\n") +
    (unmapped
      ? `\n\n_(${unmapped} existing question(s) carry a tag that is not one of the ` +
        `subtopics above — legacy rows. Ignore them; author only against the list.)_`
      : "");

  const stemList = relevant.length
    ? relevant
        .map(s => `- [${s.difficulty}] ${excerpt(s.question)}`)
        .sort()
        .join("\n")
    : "_(none at the difficulties being authored — the bank is empty here)_";

  return `# Authoring prompt — ${gap.name} (\`${gap.id}\`)

_Generated by \`scripts/build-content-prompts.ts\`. Regenerate after each import._

**Target:** ${TARGET_PER_DIFFICULTY} questions at every difficulty.
**Current:** ${gap.counts.easy} easy / ${gap.counts.medium} medium / ${gap.counts.hard} hard.
**This batch must produce:** **${quota}** (${gap.deficitTotal} questions total).
${
  gap.brokenAt.length
    ? `\n> ⚠ **Blocking:** this subject cannot be played at **${gap.brokenAt.join(
        ", ",
      )}** today — it is below the ${QUIZ_SIZE}-question Quick Play minimum and the card renders disabled.\n`
    : ""
}
## How to use

1. Paste everything between the two \`===\` rules below into a fresh LLM chat.
2. Save the returned JSON array to \`authored/<today>/${gap.id}.json\`.
3. Import it:

   \`\`\`
   npx tsx --env-file=.env.local scripts/import-authored-questions.ts authored/<today>/${gap.id}.json --source ai_generated --status approved
   \`\`\`

4. Re-run \`scripts/build-content-prompts.ts\` and confirm the deficit fell.

The importer rejects the whole file on any schema, taxonomy or KaTeX error, so a
clean run is the acceptance test. Duplicates are caught by \`content_hash\` and
skipped, not failed.

===

${instruction.replace(
  "[…keep your existing taxonomy list here, unchanged…]",
  taxonomy,
)}

## THIS BATCH

Author **exactly ${gap.deficitTotal} questions**, all with \`"subject": "${gap.id}"\`:

${short.map(d => `- **${gap.deficit[d]} × \`"difficulty": "${d}"\`**`).join("\n")}

Do not author any other difficulty — the other tiers are already at target and
extra questions there are wasted effort.

Spread them across the subtopics below, favouring the ones with the fewest
existing questions. Use only these subtopic labels, verbatim:

${coverage}

### Already in the bank — do not re-author these

These are the existing stems at the difficulties you are writing. Cover different
facts, methods and scenarios; a rephrasing of one of these is a duplicate.

${stemList}

===
`;
}

async function main(): Promise<void> {
  const subjects = JSON.parse(
    readFileSync(join(ROOT, "data", "subjects.json"), "utf8"),
  ) as Subject[];

  const stats = await rpc<StatRow[]>("get_subject_stats");

  const counts = new Map<string, Record<Difficulty, number>>();
  for (const row of stats) {
    const entry = counts.get(row.subject) ?? { easy: 0, medium: 0, hard: 0 };
    entry[row.difficulty] = row.cnt;
    counts.set(row.subject, entry);
  }

  const gaps: SubjectGap[] = [];
  for (const subject of subjects) {
    const c = counts.get(subject.id);
    // Subjects with no questions anywhere are invisible in the grid
    // (app/(main)/page.tsx filters on count > 0) and are out of scope for 1.0
    // by decision — they are reported, not targeted.
    const total = c ? c.easy + c.medium + c.hard : 0;
    const safe = c ?? { easy: 0, medium: 0, hard: 0 };
    const deficit = {
      easy: Math.max(0, TARGET_PER_DIFFICULTY - safe.easy),
      medium: Math.max(0, TARGET_PER_DIFFICULTY - safe.medium),
      hard: Math.max(0, TARGET_PER_DIFFICULTY - safe.hard),
    };
    const brokenAt = DIFFICULTIES.filter(d => safe[d] < QUIZ_SIZE);
    const deficitTotal = deficit.easy + deficit.medium + deficit.hard;

    gaps.push({
      id: subject.id,
      name: subject.name,
      counts: safe,
      total,
      deficit,
      deficitTotal,
      priority: total === 0 ? "ok" : brokenAt.length ? "broken" : deficitTotal ? "thin" : "ok",
      brokenAt: total === 0 ? [] : brokenAt,
      subtopics: subject.subtopics ?? [],
    });
  }

  // Empty subjects are excluded from the work list by decision (see the plan):
  // they are already invisible to users, so filling them is not a 1.0 gate.
  const targets = gaps
    .filter(g => g.total > 0 && g.deficitTotal > 0)
    .sort((a, b) => b.deficitTotal - a.deficitTotal);

  mkdirSync(OUT_DIR, { recursive: true });
  if (existsSync(PROMPT_DIR)) rmSync(PROMPT_DIR, { recursive: true });
  mkdirSync(PROMPT_DIR, { recursive: true });

  const report = {
    generated_at: new Date().toISOString(),
    target_per_difficulty: TARGET_PER_DIFFICULTY,
    quiz_size: QUIZ_SIZE,
    basis: "questions with status='approved' and visibility='shared' (get_subject_stats)",
    totals: {
      subjects_in_taxonomy: gaps.length,
      subjects_with_questions: gaps.filter(g => g.total > 0).length,
      questions_live: gaps.reduce((n, g) => n + g.total, 0),
      deficit_total: targets.reduce((n, g) => n + g.deficitTotal, 0),
      deficit_hard: targets.reduce((n, g) => n + g.deficit.hard, 0),
      subjects_broken: gaps.filter(g => g.priority === "broken").length,
    },
    subjects: gaps,
  };
  writeFileSync(
    join(OUT_DIR, "content-gap.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  const instruction = readFileSync(
    join(ROOT, "docs", "instruction_external_LLM.txt"),
    "utf8",
  );

  for (const gap of targets) {
    const stems = await fetchStems(gap.id);
    writeFileSync(
      join(PROMPT_DIR, `${gap.id}.md`),
      buildPrompt(gap, stems, instruction),
      "utf8",
    );
  }

  const index = [
    "# Content prompt pack — 1.0",
    "",
    `_Generated ${report.generated_at} by \`scripts/build-content-prompts.ts\`._`,
    "",
    `Target: **${TARGET_PER_DIFFICULTY} per difficulty**. Live bank: ` +
      `**${report.totals.questions_live}** questions across ` +
      `**${report.totals.subjects_with_questions}** subjects. ` +
      `Deficit: **${report.totals.deficit_total}** ` +
      `(**${report.totals.deficit_hard}** of them hard).`,
    "",
    "| Subject | easy | med | hard | to author | status |",
    "| --- | ---: | ---: | ---: | ---: | --- |",
    ...targets.map(
      g =>
        `| [${g.name}](${g.id}.md) | ${g.counts.easy} | ${g.counts.medium} | ` +
        `${g.counts.hard} | **${g.deficitTotal}** | ` +
        (g.priority === "broken" ? `⚠ unplayable at ${g.brokenAt.join(", ")}` : "thin") +
        " |",
    ),
    "",
    "Subjects at or above target are omitted. Regenerate this pack after every",
    "import — the quotas and the do-not-repeat lists both move.",
    "",
  ].join("\n");
  writeFileSync(join(PROMPT_DIR, "README.md"), `${index}\n`, "utf8");

  console.log(
    `content-gap.json + ${targets.length} prompts written to docs/release/\n` +
      `deficit: ${report.totals.deficit_total} questions ` +
      `(${report.totals.deficit_hard} hard), ` +
      `${report.totals.subjects_broken} subject(s) unplayable today`,
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
