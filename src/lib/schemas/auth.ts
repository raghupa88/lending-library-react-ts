import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name"),
    email: z.email("Enter a valid email address"),
    phone: z
      .string()
      .trim()
      .regex(/^[+\d][\d\s-]{7,14}$/, "Enter a valid phone number")
      .or(z.literal(""))
      .optional(),
    address: z.string().trim().max(200, "Keep the address under 200 characters").optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
