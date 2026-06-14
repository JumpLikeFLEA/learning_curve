import { callCritic } from "./llm";
import { CRITIC_SYSTEM_PROMPT, buildCriticUserPrompt } from "./prompts";
import { CriticReportArraySchema } from "./schema";
import type { RawQuestion, CriticReport } from "./types";

export async function critique(questions: RawQuestion[]): Promise<CriticReport[]> {
  if (questions.length === 0) return [];

  const userPrompt = buildCriticUserPrompt(questions);
  const raw = await callCritic(CRITIC_SYSTEM_PROMPT, userPrompt);

  const reports = CriticReportArraySchema.parse(raw) as CriticReport[];
  if (reports.length !== questions.length) {
    throw new Error(
      `Critic returned ${reports.length} reports for ${questions.length} questions`
    );
  }
  return reports;
}
