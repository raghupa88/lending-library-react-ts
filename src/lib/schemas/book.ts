import { z } from "zod";

// Optional numeric inputs stay strings in the form (empty = omitted) and are
// converted to numbers at submit time; required numerics use pinned coercion.
export const bookSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  author: z.string().trim().min(1, "Author is required"),
  isbn: z.string().trim().min(10, "Enter a valid ISBN"),
  description: z.string().trim().optional(),
  totalCopies: z.coerce.number<number>().int().min(1, "At least one copy"),
  purchasePrice: z.coerce.number<number>().min(0, "Price can't be negative"),
  category: z.string().trim().min(1, "Category is required"),
  language: z.string().trim().min(1, "Language is required"),
  pageCount: z.string().trim().regex(/^\d*$/, "Numbers only").optional(),
  publishedYear: z
    .string()
    .trim()
    .regex(/^$|^\d{4}$/, "Enter a 4-digit year")
    .optional(),
  coverUrl: z.union([z.url("Enter a valid URL"), z.literal("")]).optional(),
});

export type BookFormValues = z.infer<typeof bookSchema>;
