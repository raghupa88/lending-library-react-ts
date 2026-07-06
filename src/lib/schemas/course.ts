import { z } from "zod";

const TRACKS = [
  "MONEY_FOUNDATIONS",
  "EQUITIES",
  "BONDS_FIXED_INCOME",
  "DERIVATIVES",
  "PORTFOLIO_RISK",
] as const;

const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;

export const courseSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers, and hyphens only"),
  title: z.string().trim().min(1, "Title is required"),
  track: z.enum(TRACKS),
  level: z.enum(LEVELS),
  language: z.string().trim().min(1, "Language is required"),
  summary: z.string().trim().min(1, "Summary is required"),
  price: z.coerce.number<number>().min(0, "Price can't be negative"),
});

export type CourseFormValues = z.infer<typeof courseSchema>;

export const moduleSchema = z.object({
  title: z.string().trim().min(1, "Module title is required"),
});

export type ModuleFormValues = z.infer<typeof moduleSchema>;

export const LESSON_KINDS = ["VIDEO", "ARTICLE", "PDF", "SLIDES"] as const;

export const lessonSchema = z.object({
  title: z.string().trim().min(1, "Lesson title is required"),
  kind: z.enum(LESSON_KINDS),
  contentUrl: z.union([z.url("Enter a valid URL"), z.literal("")]).optional(),
  body: z.string().trim().optional(),
  estMinutes: z.coerce.number<number>().int().min(1, "At least 1 minute"),
});

export type LessonFormValues = z.infer<typeof lessonSchema>;
