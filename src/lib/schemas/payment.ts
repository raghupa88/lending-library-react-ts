import { z } from "zod";

export const paymentSchema = z.object({
  cardholderName: z.string().trim().min(1, "Cardholder name is required"),
  cardNumber: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s|-/g, ""))
    .pipe(z.string().regex(/^\d{13,19}$/, "Enter a valid card number")),
  expiryMonth: z
    .string()
    .trim()
    .regex(/^(0[1-9]|1[0-2])$/, "MM"),
  expiryYear: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "YYYY"),
  cvc: z.string().trim().regex(/^\d{3,4}$/, "CVC"),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;
