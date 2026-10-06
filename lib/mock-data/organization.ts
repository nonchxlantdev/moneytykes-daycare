import type { Classroom, Device, Organization, OrganizationMembership, User } from "@/types/domain";
import { DEMO_TIMEZONE } from "./demo-clock";

/**
 * SAMPLE TENANT. Little Stars Daycare is demo data only — the platform
 * is white-label and must never assume this organization exists.
 */
export const ORG_ID = "org_little_stars";

export const mockOrganization: Organization = {
  id: ORG_ID,
  name: "Little Stars Daycare",
  legalName: "Little Stars Early Learning Ltd.",
  slug: "little-stars",
  tagline: "Learn • Play • Grow",
  timezone: DEMO_TIMEZONE,
  currency: "BZD",
  locale: "en-BZ",
  address: "14 Coconut Drive, Belize City, Belize",
  phone: "+501 223-4567",
  email: "hello@littlestars.example",
  website: "littlestars.example",
  kioskWelcomeMessage: "Welcome!",
  expectedArrivalBy: "08:30",
  plan: "professional",
  branding: {
    logoUrl: "/tenants/little-stars/logo.svg",
    primaryColor: "#2f6bea",
    secondaryColor: "#7c4dff",
    accentColor: "#f28c28",
  },
  receipt: {
    businessName: "Little Stars Early Learning Ltd.",
    taxId: "GST 000-123-456",
    receiptPrefix: "LS",
    footerNote: "Thank you for trusting us with your little star!",
  },
};

export const mockClassrooms: Classroom[] = [
  { id: "infants", organizationId: ORG_ID, name: "Infants", ageRange: "6–18 months" },
  { id: "toddlers", organizationId: ORG_ID, name: "Toddlers", ageRange: "18 months–3 years" },
  { id: "preschool", organizationId: ORG_ID, name: "Preschool", ageRange: "3–4 years" },
  { id: "pre-k", organizationId: ORG_ID, name: "Pre-K", ageRange: "4–5 years" },
];

export const mockUsers: User[] = [
  { id: "usr_sarah_johnson", name: "Sarah Johnson", email: "sarah@littlestars.example" },
];

export const mockMemberships: OrganizationMembership[] = [
  { id: "mem_1", organizationId: ORG_ID, userId: "usr_sarah_johnson", role: "ADMIN" },
];

export const mockDevices: Device[] = [
  { id: "dev_front_desk_ipad", organizationId: ORG_ID, name: "Front Desk iPad", kind: "KIOSK" },
];
