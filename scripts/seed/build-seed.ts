/**
 * DEVELOPMENT SEED — builds SQL for the sample tenant "Little Stars Daycare".
 *
 * Pure and deterministic (apart from `now` and the bcrypt salts), so it can be
 * unit-tested against the in-memory database and executed by wrangler.
 * Everything uses `INSERT OR IGNORE` with stable IDs: re-running never deletes or
 * overwrites existing rows. Little Stars is SAMPLE DATA — the application never
 * assumes it exists.
 *
 * Also creates a second, unrelated sample tenant ("Rainbow Learning Centre") that
 * the seeded owner is NOT a member of, so tenant isolation can be checked by hand.
 */
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { addDays, zonedTimeToUtc } from "../../lib/utils/timezone";

export interface SeedOptions {
  /** auth_provider_id of the person to make DAYCARE_OWNER (e.g. "password:usr_bootstrap"). */
  adminAuthProviderId: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  now: Date;
}

export interface SeedResult {
  statements: string[];
  summary: Record<string, number | string>;
  /** Demo time-clock PINs (development only — printed by the CLI, stored only as bcrypt hashes). */
  demoPins: Array<{ name: string; pin: string }>;
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

/** Stable UUID-shaped id from a name, so re-runs hit the same rows. */
export function seedId(name: string): string {
  const h = createHash("sha1").update(`vision-forge-daycare-seed:${name}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${h.slice(18, 20)}-${h.slice(20, 32)}`;
}

type SqlValue = string | number | boolean | null | undefined | Date;

function literal(v: SqlValue): string {
  if (v === null || v === undefined) return "NULL";
  if (v instanceof Date) return String(v.getTime());
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "number") return String(v);
  return `'${v.replace(/'/g, "''")}'`;
}

function insert(table: string, row: Record<string, SqlValue>): string {
  const cols = Object.keys(row);
  return `INSERT OR IGNORE INTO ${table} (${cols.join(", ")}) VALUES (${cols.map((c) => literal(row[c])).join(", ")});`;
}

/** Deterministic PRNG so the generated history is stable for a given day. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hhmm(totalMinutes: number): string {
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(Math.round(totalMinutes % 60)).padStart(2, "0")}`;
}

function dateKeyIn(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function isWeekend(dateKey: string): boolean {
  const day = new Date(`${dateKey}T12:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

/* ------------------------------------------------------------------ */
/* fixtures                                                            */
/* ------------------------------------------------------------------ */

const TZ = "America/Belize";

const CLASSROOMS = [
  { key: "infants", name: "Infants", ageRange: "6–18 months" },
  { key: "toddlers", name: "Toddlers", ageRange: "18 months–3 years" },
  { key: "preschool", name: "Preschool", ageRange: "3–4 years" },
  { key: "pre-k", name: "Pre-K", ageRange: "4–5 years" },
] as const;
type ClassKey = (typeof CLASSROOMS)[number]["key"];

/** [key, first, last, dob, class, allergies, medical notes]. The first eight are the named demo children. */
const CHILDREN: Array<[string, string, string, string, ClassKey, string?, string?]> = [
  ["amari-young", "Amari", "Young", "2021-03-14", "toddlers", "Peanuts", "Carries an EpiPen in her backpack. Staff trained."],
  ["jayden-smith", "Jayden", "Smith", "2022-07-02", "preschool"],
  ["sophie-jones", "Sophie", "Jones", "2022-01-19", "preschool", undefined, "Mild eczema — fragrance-free sunscreen only."],
  ["noah-brown", "Noah", "Brown", "2023-05-27", "toddlers"],
  ["emma-white", "Emma", "White", "2021-11-08", "pre-k", "Dairy"],
  ["liam-carter", "Liam", "Carter", "2022-09-30", "preschool"],
  ["olivia-martin", "Olivia", "Martin", "2023-02-11", "toddlers"],
  ["ethan-wilson", "Ethan", "Wilson", "2021-06-23", "pre-k"],
  ["mia-garcia", "Mia", "Garcia", "2024-12-04", "infants"],
  ["lucas-ramirez", "Lucas", "Ramirez", "2025-02-17", "infants"],
  ["ava-thompson", "Ava", "Thompson", "2022-04-09", "preschool", "Eggs"],
  ["mason-clark", "Mason", "Clark", "2021-08-15", "pre-k"],
  ["isabella-lewis", "Isabella", "Lewis", "2023-07-21", "toddlers"],
  ["elijah-walker", "Elijah", "Walker", "2022-10-12", "preschool"],
  ["chloe-hall", "Chloe", "Hall", "2024-09-01", "infants"],
  ["james-allen", "James", "Allen", "2021-04-30", "pre-k", undefined, "Asthma — inhaler kept in classroom first-aid kit."],
  ["zoe-king", "Zoe", "King", "2023-03-03", "toddlers"],
  ["benjamin-wright", "Benjamin", "Wright", "2022-02-25", "preschool"],
  ["layla-scott", "Layla", "Scott", "2021-12-19", "pre-k"],
  ["daniel-green", "Daniel", "Green", "2023-09-14", "toddlers"],
  ["aria-baker", "Aria", "Baker", "2025-01-08", "infants"],
  ["henry-adams", "Henry", "Adams", "2022-06-06", "preschool"],
  ["nora-nelson", "Nora", "Nelson", "2021-09-27", "pre-k", "Strawberries"],
  ["sebastian-hill", "Sebastian", "Hill", "2023-11-02", "toddlers"],
  ["grace-campbell", "Grace", "Campbell", "2022-03-16", "preschool"],
  ["jack-mitchell", "Jack", "Mitchell", "2021-05-05", "pre-k"],
  ["lily-roberts", "Lily", "Roberts", "2024-10-22", "infants"],
  ["owen-turner", "Owen", "Turner", "2023-01-29", "toddlers"],
  ["hannah-phillips", "Hannah", "Phillips", "2022-08-08", "preschool"],
  ["caleb-evans", "Caleb", "Evans", "2021-10-10", "pre-k"],
  ["ella-edwards", "Ella", "Edwards", "2023-06-18", "toddlers", "Tree nuts"],
  ["wyatt-collins", "Wyatt", "Collins", "2022-11-24", "preschool"],
  ["stella-morris", "Stella", "Morris", "2024-08-13", "infants"],
  ["leo-rogers", "Leo", "Rogers", "2021-07-07", "pre-k"],
];

const MOTHERS = ["Sarah", "Keisha", "Rachel", "Danielle", "Jennifer", "Monique", "Ashley", "Tanya", "Maria", "Rosa", "Nicole", "Stephanie", "Andrea", "Melissa", "Priya", "Latoya", "Natalie", "Brianna", "Camila", "Vanessa", "Jasmine", "Erica", "Lauren", "Kimberly", "Alicia", "Gabriela", "Shanice", "Megan", "Diana", "Paula", "Tiffany", "Sandra", "Carmen", "Olga"];
const FATHERS = ["Marcus", "Andre", "Kevin", "Brandon", "Chris", "Derrick", "Jason", "Omar", "Carlos", "Luis", "Ryan", "Michael", "Anthony", "Patrick", "Raj", "Tyrone", "Steven", "Jamal", "Diego", "Victor", "Darnell", "Eric", "Justin", "Robert", "Adrian", "Javier", "Terrence", "Daniel", "Simon", "Paul", "Travis", "George", "Hector", "Ivan"];

/** [key, first, last, job title, class, hired, status, status note, demo PIN]. The first four are the named demo staff. */
const STAFF: Array<[string, string, string, string, ClassKey | null, string, "ACTIVE" | "ON_LEAVE", string | null, string]> = [
  ["sarah-wilson", "Sarah", "Wilson", "Lead Teacher", "toddlers", "2022-01-10", "ACTIVE", null, "1234"],
  ["michael-carter", "Michael", "Carter", "Assistant Teacher", "preschool", "2023-03-06", "ACTIVE", null, "2345"],
  ["jasmine-green", "Jasmine", "Green", "Teacher", "pre-k", "2022-08-22", "ACTIVE", null, "3456"],
  ["david-thompson", "David", "Thompson", "Support Staff", null, "2024-02-12", "ACTIVE", null, "4567"],
  ["maria-lopez", "Maria", "Lopez", "Infant Caregiver", "infants", "2021-09-01", "ACTIVE", null, "5678"],
  ["kevin-brooks", "Kevin", "Brooks", "Teacher", "preschool", "2024-06-17", "ACTIVE", null, "6789"],
  ["angela-reyes", "Angela", "Reyes", "Cook", null, "2023-11-01", "ACTIVE", null, "7890"],
  ["jasmine-lee", "Jasmine", "Lee", "Assistant Teacher", "infants", "2025-01-13", "ON_LEAVE", "Sick Leave", "8901"],
];

/** Today's demo arrivals ("08:15") and early pickups; only events already in the past are inserted. */
const PRESENT_TODAY: Record<string, string> = {
  "amari-young": "08:15", "emma-white": "08:18", "sophie-jones": "08:20", "jayden-smith": "08:22", "liam-carter": "08:25",
  "olivia-martin": "08:30", "ethan-wilson": "08:37", "noah-brown": "08:41", "mia-garcia": "07:32", "lucas-ramirez": "07:36",
  "isabella-lewis": "07:41", "elijah-walker": "07:44", "chloe-hall": "07:48", "james-allen": "07:52", "zoe-king": "07:55",
  "benjamin-wright": "08:01", "layla-scott": "08:04", "daniel-green": "08:07", "aria-baker": "08:10", "henry-adams": "08:11",
  "nora-nelson": "08:12", "sebastian-hill": "08:13",
};
const LEFT_TODAY: Record<string, [string, string]> = {
  "grace-campbell": ["07:15", "11:45"], "jack-mitchell": ["07:18", "12:00"], "lily-roberts": ["07:20", "12:10"],
  "owen-turner": ["07:24", "12:15"], "hannah-phillips": ["07:26", "12:30"], "caleb-evans": ["07:28", "12:40"],
  "ella-edwards": ["07:34", "12:45"], "wyatt-collins": ["07:38", "13:00"], "stella-morris": ["07:46", "13:10"],
  "leo-rogers": ["07:58", "13:20"],
};
// Not arrived today: ava-thompson, mason-clark.

const STAFF_TODAY: Array<[string, string, string?]> = [
  ["maria-lopez", "08:12"], ["sarah-wilson", "07:45"], ["michael-carter", "07:50"], ["jasmine-green", "08:00"],
  ["kevin-brooks", "08:15"], ["david-thompson", "08:10"], ["angela-reyes", "06:30", "11:30"],
];

/* ------------------------------------------------------------------ */
/* builder                                                             */
/* ------------------------------------------------------------------ */

export const LITTLE_STARS_ORG_ID = seedId("org:little-stars");
export const RAINBOW_ORG_ID = seedId("org:rainbow");

export async function buildSeed(opts: SeedOptions): Promise<SeedResult> {
  const out: string[] = [];
  const now = opts.now;
  const ts = now.getTime();
  const org = LITTLE_STARS_ORG_ID;
  const stamp = { created_at: ts, updated_at: ts };

  /* organization + branding */
  out.push(
    insert("organizations", {
      id: org, name: "Little Stars Daycare", slug: "little-stars", legal_name: "Little Stars Early Learning Ltd.",
      tagline: "Learn • Play • Grow", status: "ACTIVE", timezone: TZ, currency: "BZD", expected_arrival_by: "08:30",
      address_line_1: "14 Coconut Drive", city: "Belize City", state_region: "Belize District", country: "Belize",
      phone: "+501 223-4567", email: "hello@littlestars.example", website: "littlestars.example", ...stamp,
    }),
    insert("organization_branding", {
      id: seedId("branding:little-stars"), organization_id: org, logo_url: "/tenants/little-stars/logo.svg",
      primary_color: "#2f6bea", secondary_color: "#7c4dff", accent_color: "#f28c28", kiosk_welcome_message: "Welcome!",
      receipt_business_name: "Little Stars Early Learning Ltd.", receipt_tax_id: "GST 000-123-456", receipt_prefix: "LS",
      receipt_footer: "Thank you for trusting us with your little star!", ...stamp,
    }),
  );

  /* owner user + membership (identity comes from the auth layer, never a password) */
  const userId = seedId(`user:${opts.adminAuthProviderId}`);
  out.push(
    insert("users", {
      id: userId, auth_provider_id: opts.adminAuthProviderId, email: opts.adminEmail.toLowerCase(),
      first_name: opts.adminFirstName, last_name: opts.adminLastName, status: "ACTIVE", ...stamp,
    }),
    // Resolve the user by auth_provider_id in case the row already existed with another id.
    `INSERT OR IGNORE INTO organization_memberships (id, organization_id, user_id, role, status, created_at, updated_at) ` +
      `SELECT ${literal(seedId(`membership:little-stars:${opts.adminAuthProviderId}`))}, ${literal(org)}, id, 'DAYCARE_OWNER', 'ACTIVE', ${ts}, ${ts} ` +
      `FROM users WHERE auth_provider_id = ${literal(opts.adminAuthProviderId)};`,
  );

  /* classrooms + device */
  const classroomId = (key: ClassKey) => seedId(`classroom:little-stars:${key}`);
  CLASSROOMS.forEach((c, i) =>
    out.push(insert("classrooms", { id: classroomId(c.key), organization_id: org, name: c.name, age_range: c.ageRange, sort_order: i, ...stamp })),
  );
  const deviceId = seedId("device:little-stars:front-desk");
  out.push(insert("devices", { id: deviceId, organization_id: org, name: "Front Desk iPad", device_type: "KIOSK", status: "ACTIVE", last_seen_at: ts, ...stamp }));

  /* children, guardians, links */
  const childId = (key: string) => seedId(`child:little-stars:${key}`);
  const pickupGuardians = new Map<string, { primary: string; other: string }>();
  let guardianCount = 0;
  const phoneFor = (n: number) => `+501 6${String(10 + (n % 89)).padStart(2, "0")}-${String(1000 + ((n * 7919) % 9000)).slice(0, 4)}`;

  CHILDREN.forEach(([key, first, last, dob, cls, allergies, medical], i) => {
    out.push(
      insert("children", {
        id: childId(key), organization_id: org, first_name: first, last_name: last, date_of_birth: dob,
        classroom_id: classroomId(cls), enrollment_status: "ACTIVE",
        enrollment_date: `20${24 + (i % 3 === 0 ? 1 : 0)}-0${(i % 8) + 1}-0${(i % 9) + 1}`,
        allergy_notes: allergies ?? null, medical_notes: medical ?? null,
        general_notes: key === "amari-young" ? "Loves painting and the reading corner. Naps best with her blue blanket." : null,
        ...stamp,
      }),
    );
    const addGuardian = (gFirst: string, relationship: string, flags: { primary: boolean; pickup: boolean; emergency: boolean }) => {
      const gid = seedId(`guardian:little-stars:${key}:${relationship}`);
      guardianCount += 1;
      out.push(
        insert("guardians", {
          id: gid, organization_id: org, first_name: gFirst, last_name: last, phone: phoneFor(guardianCount + 2),
          email: `${gFirst.toLowerCase()}.${last.toLowerCase()}@mail.example`, ...stamp,
        }),
        insert("child_guardians", {
          id: seedId(`link:little-stars:${key}:${relationship}`), organization_id: org, child_id: childId(key), guardian_id: gid,
          relationship, is_primary: flags.primary, authorized_pickup: flags.pickup, emergency_contact: flags.emergency, ...stamp,
        }),
      );
      return gid;
    };
    const hasGrandparent = i % 3 === 0;
    const mother = addGuardian(MOTHERS[i], "Mother", { primary: true, pickup: true, emergency: false });
    const father = addGuardian(FATHERS[i], "Father", { primary: false, pickup: true, emergency: !hasGrandparent });
    if (hasGrandparent) addGuardian(i % 2 === 0 ? "Ruth" : "Gloria", "Grandmother", { primary: false, pickup: false, emergency: true });
    pickupGuardians.set(key, { primary: mother, other: father });
  });

  /* staff with hashed demo PINs */
  const staffId = (key: string) => seedId(`staff:little-stars:${key}`);
  const demoPins: SeedResult["demoPins"] = [];
  for (const [key, first, last, title, cls, hired, status, note, pin] of STAFF) {
    out.push(
      insert("staff", {
        id: staffId(key), organization_id: org, first_name: first, last_name: last, job_title: title,
        classroom_id: cls ? classroomId(cls) : null, employment_status: status, status_note: note,
        email: `${first.toLowerCase()}.${last[0].toLowerCase()}@littlestars.example`, phone: phoneFor(first.length * 17 + last.length),
        hire_date: hired, employee_number: `LS-${String(STAFF.findIndex((s) => s[0] === key) + 101)}`,
        pin_hash: await bcrypt.hash(pin, 10), ...stamp,
      }),
    );
    demoPins.push({ name: `${first} ${last}`, pin });
  }

  /* attendance + staff time history: previous 10 weekdays + today (past events only) */
  const today = dateKeyIn(now, TZ);
  const days: string[] = [];
  for (let back = 1; days.length < 10; back++) {
    const d = addDays(today, -back);
    if (!isWeekend(d)) days.unshift(d);
  }
  let attendanceCount = 0;
  let staffEventCount = 0;
  const attendance = (key: string, type: "CHECK_IN" | "CHECK_OUT", date: string, time: string) => {
    const at = zonedTimeToUtc(date, time, TZ);
    if (at.getTime() > ts) return;
    const g = pickupGuardians.get(key)!;
    const eventKey = `att:little-stars:${key}:${date}:${type}`;
    attendanceCount += 1;
    out.push(
      insert("attendance_events", {
        id: seedId(eventKey), organization_id: org, child_id: childId(key), guardian_id: type === "CHECK_IN" ? g.primary : g.other,
        event_type: type, event_time: at, device_id: deviceId, signature_object_key: null, created_by_user_id: null,
        client_event_id: seedId(`client:${eventKey}`), created_at: at,
      }),
    );
  };
  const clock = (key: string, type: "CLOCK_IN" | "CLOCK_OUT", date: string, time: string) => {
    const at = zonedTimeToUtc(date, time, TZ);
    if (at.getTime() > ts) return;
    const eventKey = `ste:little-stars:${key}:${date}:${type}`;
    staffEventCount += 1;
    out.push(
      insert("staff_time_events", {
        id: seedId(eventKey), organization_id: org, staff_id: staffId(key), event_type: type, event_time: at,
        device_id: deviceId, created_by_user_id: null, client_event_id: seedId(`client:${eventKey}`), created_at: at,
      }),
    );
  };

  for (const date of days) {
    const rand = seededRandom(parseInt(date.replaceAll("-", ""), 10));
    for (const [key] of CHILDREN) {
      if (rand() < 0.07) continue; // ~93% attendance
      attendance(key, "CHECK_IN", date, hhmm(435 + Math.floor(rand() * 85))); // 7:15 – 8:40
      attendance(key, "CHECK_OUT", date, hhmm(930 + Math.floor(rand() * 135))); // 3:30 – 5:45
    }
    for (const [key, , , , , , status] of STAFF) {
      if (status !== "ACTIVE" && date >= days[days.length - 3]) continue; // on leave recently
      if (rand() < 0.05) continue;
      const cook = key === "angela-reyes";
      const start = cook ? 390 : 450 + Math.floor(rand() * 35);
      const length = cook ? 300 : 480 + Math.floor(rand() * 60);
      clock(key, "CLOCK_IN", date, hhmm(start));
      clock(key, "CLOCK_OUT", date, hhmm(start + length));
    }
  }
  if (!isWeekend(today)) {
    for (const [key, time] of Object.entries(PRESENT_TODAY)) attendance(key, "CHECK_IN", today, time);
    for (const [key, [inAt, outAt]] of Object.entries(LEFT_TODAY)) {
      attendance(key, "CHECK_IN", today, inAt);
      attendance(key, "CHECK_OUT", today, outAt);
    }
    for (const [key, inAt, outAt] of STAFF_TODAY) {
      clock(key, "CLOCK_IN", today, inAt);
      if (outAt) clock(key, "CLOCK_OUT", today, outAt);
    }
  }

  /* second, unrelated tenant for manual isolation checks (no membership for the seeded owner) */
  const rainbow = RAINBOW_ORG_ID;
  out.push(
    insert("organizations", {
      id: rainbow, name: "Rainbow Learning Centre", slug: "rainbow-learning", tagline: "Every colour counts", status: "ACTIVE",
      timezone: "America/Chicago", currency: "USD", expected_arrival_by: "08:00", city: "Austin", country: "United States", ...stamp,
    }),
    insert("organization_branding", {
      id: seedId("branding:rainbow"), organization_id: rainbow, primary_color: "#0f8b8d", secondary_color: "#3d5a80",
      accent_color: "#ee6c4d", kiosk_welcome_message: "Hello!", receipt_prefix: "RLC", ...stamp,
    }),
  );
  for (const [key, first, last] of [["rb-1", "Rainbow", "Childone"], ["rb-2", "Rainbow", "Childtwo"], ["rb-3", "Rainbow", "Childthree"]]) {
    out.push(
      insert("children", {
        id: seedId(`child:rainbow:${key}`), organization_id: rainbow, first_name: first, last_name: last,
        date_of_birth: "2022-05-05", enrollment_status: "ACTIVE", ...stamp,
      }),
    );
  }

  return {
    statements: out,
    demoPins,
    summary: {
      organization: "Little Stars Daycare",
      classrooms: CLASSROOMS.length,
      children: CHILDREN.length,
      guardians: guardianCount,
      staff: STAFF.length,
      attendanceEvents: attendanceCount,
      staffTimeEvents: staffEventCount,
      owner: `${opts.adminEmail} (${opts.adminAuthProviderId})`,
    },
  };
}
