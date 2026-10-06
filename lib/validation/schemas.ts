/**
 * Client-only form schemas for modules that are still mock data in Phase 2.
 *
 * Every schema for a REAL database mutation lives in ./mutations.ts and is
 * re-validated on the server. Payments move there in Phase 3 (Stripe).
 */
import { z } from "zod";

export const paymentFormSchema = z.object({
  childId: z.string().min(1, "Select a child"),
  guardianId: z.string().min(1, "Select a guardian"),
  amount: z
    .number({ message: "Enter an amount" })
    .positive("Amount must be greater than zero")
    .max(100_000, "That amount looks too large"),
  method: z.enum(["CASH", "BANK_TRANSFER", "CARD", "OTHER"]),
  reference: z.string().max(60).optional(),
  note: z.string().max(200).optional(),
});
export type PaymentFormValues = z.infer<typeof paymentFormSchema>;
