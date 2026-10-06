import type { ChildDocument } from "@/types/domain";
import { demoTime } from "./demo-clock";
import { ORG_ID } from "./organization";

/**
 * Non-attendance operational notes that appear alongside derived
 * attendance/time-clock events in activity feeds. In production these
 * come from audit_logs.
 */
export interface ActivityNote {
  id: string;
  organizationId: string;
  at: string;
  kind: "PAYMENT" | "NOTE" | "SYSTEM";
  message: string;
}

export const buildActivityNotes = (): ActivityNote[] => [
  { id: "act_1", organizationId: ORG_ID, at: demoTime("07:05"), kind: "SYSTEM", message: "Front Desk iPad kiosk came online" },
];

/** Child document metadata (files would live in private R2). */
export const buildChildDocuments = (): ChildDocument[] => [
  { id: "doc_1", organizationId: ORG_ID, childId: "amari-young", name: "Enrollment Agreement.pdf", kind: "ENROLLMENT", uploadedAt: demoTime("10:12", 410), objectKey: "orgs/org_little_stars/children/amari-young/enrollment.pdf" },
  { id: "doc_2", organizationId: ORG_ID, childId: "amari-young", name: "Immunization Record.pdf", kind: "MEDICAL", uploadedAt: demoTime("09:40", 300), objectKey: "orgs/org_little_stars/children/amari-young/immunization.pdf", expiresOn: "2027-03-14" },
  { id: "doc_3", organizationId: ORG_ID, childId: "amari-young", name: "Allergy Action Plan.pdf", kind: "MEDICAL", uploadedAt: demoTime("14:05", 120), objectKey: "orgs/org_little_stars/children/amari-young/allergy-plan.pdf" },
  { id: "doc_4", organizationId: ORG_ID, childId: "amari-young", name: "Photo & Media Consent.pdf", kind: "CONSENT", uploadedAt: demoTime("10:15", 410), objectKey: "orgs/org_little_stars/children/amari-young/media-consent.pdf" },
];
