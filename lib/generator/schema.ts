import { z } from "zod";

export const DifficultySchema = z.enum(["easy", "medium", "hard"]);

export const GenerateInputSchema = z.object({
  subject: z.string().min(1),
  subjectId: z.string().min(1),
  difficulty: DifficultySchema,
  subtopics: z.array(z.string().min(1)).min(1),
  notes: z.string().optional(),
  count: z.number().int().min(1).max(10).default(5),
});

export const RawQuestionSchema = z
  .object({
    question: z.string().min(10),
    options: z.tuple([
      z.string().min(1),
      z.string().min(1),
      z.string().min(1),
      z.string().min(1),
    ]),
    correct_answer: z.string().min(1),
    explanation: z.string().min(10),
    subtopic: z.string().min(1),
  })
  .refine(
    (q) => q.options.includes(q.correct_answer),
    { message: "correct_answer must match one of the four options verbatim" }
  );

export const RawQuestionArraySchema = z.array(RawQuestionSchema);

export const CriticReportSchema = z.object({
  correctness_check: z.enum(["pass", "fail", "unsure"]),
  ambiguity_check: z.enum(["pass", "fail", "unsure"]),
  distractor_quality: z.number().int().min(1).max(5),
  notes: z.string(),
});

export const CriticReportArraySchema = z.array(CriticReportSchema);
