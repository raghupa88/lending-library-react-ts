import { z } from "zod";

export const testSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  passPercent: z.coerce.number<number>().int().min(1).max(100),
  timeLimitMin: z.coerce.number<number>().int().min(1, "At least 1 minute"),
  attemptsAllowed: z.coerce.number<number>().int().min(1, "At least 1 attempt"),
});

export type TestFormValues = z.infer<typeof testSchema>;

export const QUESTION_KINDS = ["SINGLE", "MULTI", "TRUEFALSE"] as const;

export const questionSchema = z
  .object({
    prompt: z.string().trim().min(1, "Prompt is required"),
    kind: z.enum(QUESTION_KINDS),
    options: z
      .array(
        z.object({
          label: z.string().trim().min(1, "Option text is required"),
          correct: z.boolean(),
        }),
      )
      .min(2, "At least 2 options"),
  })
  .refine((q) => q.options.some((o) => o.correct), {
    message: "Mark at least one option as correct",
    path: ["options"],
  })
  .refine((q) => q.kind !== "SINGLE" || q.options.filter((o) => o.correct).length === 1, {
    message: "A single-answer question needs exactly one correct option",
    path: ["options"],
  })
  .refine((q) => q.kind !== "TRUEFALSE" || q.options.length === 2, {
    message: "A true/false question needs exactly 2 options",
    path: ["options"],
  });

export type QuestionFormValues = z.infer<typeof questionSchema>;
