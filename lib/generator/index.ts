import { v4 as uuidv4 } from "uuid";
import { slugifyForTag } from "@/lib/utils";
import { GenerateInputSchema, RawQuestionArraySchema } from "./schema";
import { callGenerator } from "./llm";
import { GENERATOR_SYSTEM_PROMPT, buildGeneratorUserPrompt } from "./prompts";
import { pickExemplars } from "./exemplars";
import { critique } from "./critic";
import { hashQuestion } from "./dedup";
import type { GenerateInput, GeneratedQuestion } from "./types";

export async function generateBatch(input: GenerateInput): Promise<GeneratedQuestion[]> {
  // 1. Validate input
  const validated = GenerateInputSchema.parse(input);

  // 2. Few-shot exemplars
  const exemplars = pickExemplars(validated.subject, validated.difficulty);

  // 3. Build prompt + call generator (Sonnet)
  const userPrompt = buildGeneratorUserPrompt(validated, exemplars);
  const rawOutput = await callGenerator(GENERATOR_SYSTEM_PROMPT, userPrompt);
  const rawQuestions = RawQuestionArraySchema.parse(rawOutput);

  if (rawQuestions.length !== validated.count) {
    console.warn(
      `Generator returned ${rawQuestions.length} questions; ${validated.count} were requested.`
    );
  }

  // 4. Critic pass (Haiku)
  const criticReports = await critique(rawQuestions);

  // 5. Assemble DB-ready questions
  const batchId = uuidv4();
  return rawQuestions.map((raw, i): GeneratedQuestion => ({
    id: `gen-${uuidv4().slice(0, 8)}`,
    type: "multiple_choice",
    subject: validated.subjectId,
    tags: [slugifyForTag(raw.subtopic)],
    difficulty: validated.difficulty,
    question: raw.question,
    options: raw.options,
    correct_answer: raw.correct_answer,
    explanation: raw.explanation,
    source: "ai_generated",
    status: "pending",
    content_hash: hashQuestion(raw.question, raw.options),
    critic_notes: criticReports[i],
    generation_batch_id: batchId,
  }));
}

// Re-export types for convenient downstream imports
export type { GenerateInput, GeneratedQuestion, CriticReport } from "./types";
