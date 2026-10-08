/**
 * Static demo daycare for Vercel / environments without D1.
 * IDs are stable UUIDs (required by mutation Zod schemas).
 * Attendance times are generated relative to "today".
 *
 * Demo staff PINs (development / Vercel demo only — never shown in the UI):
 *   Sarah Wilson  → 1234
 *   Michael Carter → 5678
 */

import type {
  AttendanceEvent,
  ChildRecord,
  Classroom,
  Organization,
  Staff,
  StaffTimeEvent,
} from "@/types/domain";
import { dateKey } from "@/lib/utils/format";
import { addDays, zonedStartOfDay } from "@/lib/utils/timezone";

export const DEMO_ORG_ID = "6a1d7718-6847-499d-ae6b-1209940f251d";
export const DEMO_USER_ID = "f171b68b-d5a2-4916-a40a-627eaccd6ec6";
export const DEMO_MEMBERSHIP_ID = "8024901c-7ff8-4e97-9f52-856679857e07";
export const DEMO_TZ = "America/Belize";

export const DEMO_STAFF_SARAH = "c9bb2af6-312c-4709-9977-ea56ed33e450";
export const DEMO_STAFF_MICHAEL = "6240da29-1c63-486b-a4b9-3f04db60260b";

/** bcrypt hashes for demo PINs 1234 / 5678 (cost 12). */
export const DEMO_STAFF_PIN_HASHES: Record<string, string> = {
  [DEMO_STAFF_SARAH]: "$2b$12$/.mbUvZl5XI25u3rUj.vtue3EBMHc3jCJKxs2qULnkQ.6gqRQ/5Uq",
  [DEMO_STAFF_MICHAEL]: "$2b$12$ecR4nNrELTaPxXjGACBUuuc8axoL.rqxUmfo.qCNDlCmrLUjT10q.",
};

const CLASS = {
  infants: "4f26ab79-a662-4a81-a980-d40784865647",
  toddlers: "3b8e3df3-c4e8-44a5-9e9e-cef45be11448",
  preschool: "fbab0d71-26b8-4d3c-a37b-f89928e3039c",
  preK: "a46c5ea3-5028-4cd2-8942-6c5efcee2229",
} as const;

export const demoOrganization: Organization = {
  id: DEMO_ORG_ID,
  name: "Money Tykes Daycare",
  legalName: "Money Tykes Daycare Ltd",
  slug: "moneytykes",
  tagline: "Where little learners grow big hearts",
  status: "ACTIVE",
  timezone: DEMO_TZ,
  currency: "BZD",
  address: "15 Albert Street, Belize City, Belize",
  addressLine1: "15 Albert Street",
  city: "Belize City",
  country: "BZ",
  phone: "+501-223-0101",
  email: "hello@moneytykes.example",
  kioskWelcomeMessage: "Welcome to Money Tykes! Tap below to check in or out.",
  expectedArrivalBy: "09:00",
  branding: {
    primaryColor: "#0F766E",
    secondaryColor: "#EA580C",
    accentColor: "#CA8A04",
  },
  receipt: {
    businessName: "Money Tykes Daycare",
    receiptPrefix: "MT",
    footerNote: "Thank you for trusting us with your little one.",
  },
};

export const demoClassrooms: Classroom[] = [
  { id: CLASS.infants, organizationId: DEMO_ORG_ID, name: "Infants", ageRange: "0–1" },
  { id: CLASS.toddlers, organizationId: DEMO_ORG_ID, name: "Toddlers", ageRange: "1–2" },
  { id: CLASS.preschool, organizationId: DEMO_ORG_ID, name: "Preschool", ageRange: "3–4" },
  { id: CLASS.preK, organizationId: DEMO_ORG_ID, name: "Pre-K", ageRange: "4–5" },
];

function child(
  id: string,
  first: string,
  last: string,
  dob: string,
  classroomId: string,
  guardians: ChildRecord["guardians"],
  extras?: Partial<ChildRecord>,
): ChildRecord {
  return {
    id,
    organizationId: DEMO_ORG_ID,
    firstName: first,
    lastName: last,
    dateOfBirth: dob,
    classroomId,
    enrollmentStatus: "ACTIVE",
    enrolledOn: "2024-09-01",
    hasAllergyAlert: Boolean(extras?.allergies?.length),
    guardians,
    ...extras,
  };
}

function guardianLink(
  childId: string,
  gId: string,
  linkId: string,
  first: string,
  last: string,
  phone: string,
  relationship: string,
  primary = true,
) {
  return {
    guardian: {
      id: gId,
      organizationId: DEMO_ORG_ID,
      firstName: first,
      lastName: last,
      phone,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
    },
    link: {
      id: linkId,
      organizationId: DEMO_ORG_ID,
      childId,
      guardianId: gId,
      relationship,
      isPrimary: primary,
      canPickUp: true,
      isEmergencyContact: primary,
    },
  };
}

const C = {
  amari: "c4c57a9d-37ad-4fe4-91b0-504916a9c7cd",
  jayden: "24fd2e83-ce2e-4563-9eb4-ce8b335b9b56",
  sophie: "1c889599-3527-457b-8f2f-98ce85cc0cde",
  noah: "e6c81705-5b96-4246-9fb2-ec0653e38ba6",
  emma: "2466df65-9a2c-4e72-a465-597e9dcc30cc",
  liam: "3566e317-97d0-4211-9d46-c0faae7a6ab1",
  olivia: "50d34c82-b894-45fa-a680-42a31256c449",
  ethan: "2101f1bc-bc3a-436f-a0a3-0e775c7fe254",
  ava: "96b21b38-9fc8-49c9-b882-eecf791ebedf",
  mia: "9b89fb9f-bfd7-4188-9585-48d8661c0732",
  lucas: "1fb00e0d-edc6-4ea8-a538-466aac6d8ef8",
  isabella: "379600f5-6473-46ed-b285-f163db516e87",
} as const;

const G = {
  shamira: "2c3b9854-fca6-413f-ac09-07e6c2b4a273",
  maya: "dbc1d3e8-9b01-4a06-b103-42eff41d3821",
  kevin: "1d7c7430-2186-4653-9aae-e0875b268fd4",
  lisa: "fa1ab429-4e19-4643-a65b-b37c9e074399",
  elena: "9ef83621-428e-4d11-997e-881d4e678f03",
  david: "d95e6208-55c5-4496-b2eb-afb96eb54d22",
  nina: "2ef95ac9-45e4-439f-a57f-a2c68ab771a7",
  grace: "945152a3-f3bd-479d-9ea1-75dc996f8dee",
  sarahG: "80d79fef-a61d-4213-beb8-35b8a4e2cc64",
  james: "a1111111-1111-4111-8111-111111111101",
  jasmine: "a1111111-1111-4111-8111-111111111102",
  rosa: "a1111111-1111-4111-8111-111111111103",
  amy: "a1111111-1111-4111-8111-111111111104",
} as const;

const L = {
  amari: "b1111111-1111-4111-8111-111111111101",
  jayden1: "b1111111-1111-4111-8111-111111111102",
  jayden2: "b1111111-1111-4111-8111-111111111103",
  sophie: "b1111111-1111-4111-8111-111111111104",
  noah: "b1111111-1111-4111-8111-111111111105",
  emma: "b1111111-1111-4111-8111-111111111106",
  liam: "b1111111-1111-4111-8111-111111111107",
  olivia: "b1111111-1111-4111-8111-111111111108",
  ethan: "b1111111-1111-4111-8111-111111111109",
  ava: "b1111111-1111-4111-8111-111111111110",
  mia: "b1111111-1111-4111-8111-111111111111",
  lucas: "b1111111-1111-4111-8111-111111111112",
  isabella: "b1111111-1111-4111-8111-111111111113",
} as const;

export const demoRoster: ChildRecord[] = [
  child(C.amari, "Amari", "Young", "2022-03-14", CLASS.toddlers, [
    guardianLink(C.amari, G.shamira, L.amari, "Shamira", "Young", "+501-600-1001", "Mother"),
  ]),
  child(C.jayden, "Jayden", "Smith", "2021-07-22", CLASS.preschool, [
    guardianLink(C.jayden, G.maya, L.jayden1, "Maya", "Smith", "+501-600-1002", "Mother"),
    guardianLink(C.jayden, G.kevin, L.jayden2, "Kevin", "Smith", "+501-600-1003", "Father", false),
  ]),
  child(C.sophie, "Sophie", "Jones", "2020-11-05", CLASS.preK, [
    guardianLink(C.sophie, G.lisa, L.sophie, "Lisa", "Jones", "+501-600-1004", "Mother"),
  ]),
  child(
    C.noah,
    "Noah",
    "Brown",
    "2023-01-18",
    CLASS.infants,
    [guardianLink(C.noah, G.elena, L.noah, "Elena", "Brown", "+501-600-1005", "Mother")],
    { allergies: ["Peanuts"], medicalNotes: "EpiPen in backpack" },
  ),
  child(C.emma, "Emma", "White", "2021-04-30", CLASS.preschool, [
    guardianLink(C.emma, G.david, L.emma, "David", "White", "+501-600-1006", "Father"),
  ]),
  child(C.liam, "Liam", "Carter", "2022-09-12", CLASS.toddlers, [
    guardianLink(C.liam, G.nina, L.liam, "Nina", "Carter", "+501-600-1007", "Mother"),
  ]),
  child(C.olivia, "Olivia", "Martin", "2020-06-08", CLASS.preK, [
    guardianLink(C.olivia, G.grace, L.olivia, "Grace", "Martin", "+501-600-1008", "Grandmother"),
  ]),
  child(C.ethan, "Ethan", "Wilson", "2023-05-21", CLASS.infants, [
    guardianLink(C.ethan, G.sarahG, L.ethan, "Sarah", "Wilson", "+501-600-1009", "Mother"),
  ]),
  child(C.ava, "Ava", "Thompson", "2021-12-03", CLASS.preschool, [
    guardianLink(C.ava, G.james, L.ava, "James", "Thompson", "+501-600-1010", "Father"),
  ]),
  child(C.mia, "Mia", "Green", "2022-02-27", CLASS.toddlers, [
    guardianLink(C.mia, G.jasmine, L.mia, "Jasmine", "Green", "+501-600-1011", "Mother"),
  ]),
  child(C.lucas, "Lucas", "Garcia", "2020-08-15", CLASS.preK, [
    guardianLink(C.lucas, G.rosa, L.lucas, "Rosa", "Garcia", "+501-600-1012", "Mother"),
  ]),
  child(C.isabella, "Isabella", "Lee", "2023-03-09", CLASS.infants, [
    guardianLink(C.isabella, G.amy, L.isabella, "Amy", "Lee", "+501-600-1013", "Mother"),
  ]),
];

export const demoStaff: Staff[] = [
  {
    id: DEMO_STAFF_SARAH,
    organizationId: DEMO_ORG_ID,
    firstName: "Sarah",
    lastName: "Wilson",
    jobTitle: "Lead Teacher",
    classroomId: CLASS.toddlers,
    employmentStatus: "ACTIVE",
    employeeNumber: "MT-001",
    hiredOn: "2022-01-10",
    hasPin: true,
  },
  {
    id: DEMO_STAFF_MICHAEL,
    organizationId: DEMO_ORG_ID,
    firstName: "Michael",
    lastName: "Carter",
    jobTitle: "Assistant Teacher",
    classroomId: CLASS.preschool,
    employmentStatus: "ACTIVE",
    employeeNumber: "MT-002",
    hiredOn: "2022-06-01",
    hasPin: true,
  },
  {
    id: "a2222222-2222-4222-8222-222222222201",
    organizationId: DEMO_ORG_ID,
    firstName: "Jasmine",
    lastName: "Green",
    jobTitle: "Infant Caregiver",
    classroomId: CLASS.infants,
    employmentStatus: "ACTIVE",
    employeeNumber: "MT-003",
    hiredOn: "2023-02-14",
    hasPin: false,
  },
  {
    id: "a2222222-2222-4222-8222-222222222202",
    organizationId: DEMO_ORG_ID,
    firstName: "David",
    lastName: "Thompson",
    jobTitle: "Director",
    employmentStatus: "ACTIVE",
    employeeNumber: "MT-004",
    hiredOn: "2021-08-01",
    hasPin: false,
  },
];

function atLocal(date: string, hour: number, minute: number): string {
  const start = zonedStartOfDay(date, DEMO_TZ).getTime();
  return new Date(start + (hour * 60 + minute) * 60_000).toISOString();
}

/** Seed attendance + staff time for the last several weekdays (including today). */
export function buildDemoSeedEvents(now = new Date()): {
  attendance: AttendanceEvent[];
  staffTime: StaffTimeEvent[];
} {
  const today = dateKey(now, DEMO_TZ);
  const attendance: AttendanceEvent[] = [];
  const staffTime: StaffTimeEvent[] = [];
  let seq = 0;
  const id = () => {
    seq += 1;
    const hex = seq.toString(16).padStart(12, "0");
    return `c0000000-0000-4000-8000-${hex}`;
  };

  for (let back = 6; back >= 0; back--) {
    const day = addDays(today, -back);
    const dow = new Date(`${day}T12:00:00Z`).getUTCDay();
    if (dow === 0 || dow === 6) continue;

    for (const [staffId, inH, outH] of [
      [DEMO_STAFF_SARAH, 7, 16] as const,
      [DEMO_STAFF_MICHAEL, 7, 15] as const,
    ]) {
      staffTime.push({
        id: id(),
        organizationId: DEMO_ORG_ID,
        staffId,
        type: "CLOCK_IN",
        eventTime: atLocal(day, inH, 30),
      });
      if (day !== today) {
        staffTime.push({
          id: id(),
          organizationId: DEMO_ORG_ID,
          staffId,
          type: "CLOCK_OUT",
          eventTime: atLocal(day, outH, 0),
        });
      }
    }

    demoRoster.forEach((c, i) => {
      if (i % 7 === 6 && back > 0) return;
      const gId = c.guardians.find((g) => g.link.isPrimary)?.guardian.id ?? c.guardians[0]?.guardian.id;
      attendance.push({
        id: id(),
        organizationId: DEMO_ORG_ID,
        childId: c.id,
        guardianId: gId,
        type: "CHECK_IN",
        eventTime: atLocal(day, 7, 45 + (i % 20)),
      });
      const stillInToday = day === today && i < 5;
      if (!stillInToday) {
        attendance.push({
          id: id(),
          organizationId: DEMO_ORG_ID,
          childId: c.id,
          guardianId: gId,
          type: "CHECK_OUT",
          eventTime: atLocal(day, 15, 10 + (i % 25)),
        });
      }
    });
  }

  return { attendance, staffTime };
}
