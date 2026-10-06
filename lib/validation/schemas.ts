/**
 * Shared Zod schemas. The same schemas will validate server actions /
 * API routes in Phase 2 — client validation is a UX nicety, server
 * validation is the security boundary.
 */
import { z } from "zod";

const hexColor = z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, "Use a hex color like #2f6bea");
const phone = z.string().min(7, "Enter a phone number").max(24);

export const childFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date of birth")
    .refine((v) => new Date(v) <= new Date(), "Date of birth can't be in the future"),
  classroomId: z.enum(["infants", "toddlers", "preschool", "pre-k"], { message: "Choose a class" }),
  guardianFirstName: z.string().trim().min(1, "Guardian first name is required"),
  guardianLastName: z.string().trim().min(1, "Guardian last name is required"),
  guardianRelationship: z.enum(["Mother", "Father", "Grandmother", "Grandfather", "Aunt", "Uncle", "Guardian"]),
  guardianPhone: phone,
  allergies: z.string().max(200).optional(),
});
export type ChildFormValues = z.infer<typeof childFormSchema>;

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

export const brandingFormSchema = z.object({
  name: z.string().trim().min(2, "Daycare name is required").max(80),
  tagline: z.string().trim().max(80),
  logoUrl: z.string().optional(),
  primaryColor: hexColor,
  secondaryColor: hexColor,
  accentColor: hexColor,
  address: z.string().trim().max(160),
  phone,
  email: z.email("Enter a valid email"),
});
export type BrandingFormValues = z.infer<typeof brandingFormSchema>;

export const organizationSettingsSchema = z.object({
  legalName: z.string().trim().max(120),
  website: z.string().trim().max(120),
  timezone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Unknown timezone — use an IANA name like America/Belize"),
  currency: z
    .string()
    .length(3, "Use a 3-letter currency code")
    .refine((c) => {
      try {
        new Intl.NumberFormat("en-US", { style: "currency", currency: c });
        return true;
      } catch {
        return false;
      }
    }, "Unknown currency code"),
  expectedArrivalBy: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  kioskWelcomeMessage: z.string().trim().min(1, "Add a short greeting").max(120),
  receiptBusinessName: z.string().trim().min(1).max(120),
  receiptTaxId: z.string().trim().max(40),
  receiptPrefix: z.string().trim().min(1).max(6),
  receiptFooterNote: z.string().trim().max(160),
});
export type OrganizationSettingsValues = z.infer<typeof organizationSettingsSchema>;
