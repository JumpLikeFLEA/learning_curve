/**
 * AI question generator CLI seeder.
 *
 * Usage:
 *   npx tsx scripts/seed-questions-ai.ts \
 *     --subject "Data Analysis" \
 *     --difficulty easy \
 *     --subtopics "Pandas,Descriptive Statistics" \
 *     --count 5 \
 *     --notes "focus on real-world scenarios"
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *           ANTHROPIC_API_KEY in .env.local.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";
import { generateBatch } from "../lib/generator";
import type { Subject } from "../types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
  process.exit(1);
}

// ── Parse CLI args ──────────────────────────────────────────
function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

const subjectName = getArg("subject");
const difficulty = getArg("difficulty") as "easy" | "medium" | "hard" | undefined;
const subtopicsRaw = getArg("subtopics");
const notes = getArg("notes");
const countRaw = getArg("count");

if (!subjectName || !difficulty || !subtopicsRaw) {
  console.error('Usage: --subject <name> --difficulty <easy|medium|hard> --subtopics <a,b,c> [--count N] [--notes "..."]');
  process.exit(1);
}

const subtopics = subtopicsRaw.split(",").map((s) => s.trim()).filter(Boolean);
const count = countRaw ? parseInt(countRaw, 10) : 5;

// ── Resolve subjectId from subjects.json ────────────────────
const subjects = JSON.parse(readFileSync(join(process.cwd(), "data", "subjects.json"), "utf-8")) as Subject[];
const subject = subjects.find((s) => s.name === subjectName);
if (!subject) {
  console.error(`Subject "${subjectName}" not found in data/subjects.json`);
  process.exit(1);
}

// Validate subtopics exist on the subject
const unknownSubtopics = subtopics.filter((t) => !subject.subtopics?.includes(t));
if (unknownSubtopics.length > 0) {
  console.error(`Unknown subtopics for ${subjectName}: ${unknownSubtopics.join(", ")}`);
  console.error(`Available: ${(subject.subtopics ?? []).join(", ")}`);
  process.exit(1);
}

// ── Run ─────────────────────────────────────────────────────
const supabase = createClient(url, key);

async function main() {
  console.log(`Generating ${count} ${difficulty} questions for "${subjectName}" on subtopics: ${subtopics.join(", ")}...`);

  const questions = await generateBatch({
    subject: subjectName!,
    subjectId: subject!.id,
    difficulty: difficulty!,
    subtopics,
    notes,
    count,
  });

  console.log(`Generated ${questions.length} questions. Recording batch...`);

  const batchId = questions[0]?.generation_batch_id;
  if (batchId) {
    const { error: batchErr } = await supabase.from("generation_batches").insert({
      id: batchId,
      subject: subjectName,
      difficulty,
      subtopics,
      generation_notes: notes ?? null,
      requested_count: count,
      generated_count: questions.length,
      rejected_count: 0,
      generator_model: process.env.ANTHROPIC_MODEL_GENERATOR ?? "claude-sonnet-4-6",
      critic_model: process.env.ANTHROPIC_MODEL_CRITIC ?? "claude-haiku-4-5-20251001",
    });
    if (batchErr) {
      console.error("Failed to record batch:", batchErr.message);
    }
  }

  console.log(`Inserting questions (status='pending')...`);
  let inserted = 0;
  let duplicates = 0;
  for (const q of questions) {
    const { error } = await supabase.from("questions").insert({
      id: q.id,
      type: q.type,
      subject: q.subject,
      tags: q.tags,
      difficulty: q.difficulty,
      question: q.question,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      source: q.source,
      status: q.status,
      content_hash: q.content_hash,
      critic_notes: q.critic_notes,
      generation_batch_id: q.generation_batch_id,
    });
    if (error) {
      if (error.code === "23505") {
        console.log(`  duplicate: ${q.question.slice(0, 60)}...`);
        duplicates++;
      } else {
        console.error(`  insert error: ${error.message}`);
      }
    } else {
      inserted++;
    }
  }

  console.log(`Done. Inserted: ${inserted}. Duplicates skipped: ${duplicates}.`);
  console.log(`Batch ID: ${batchId}`);
  console.log(`To approve all questions in this batch:`);
  console.log(`  UPDATE questions SET status='approved', reviewed_at=NOW() WHERE generation_batch_id='${batchId}';`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
