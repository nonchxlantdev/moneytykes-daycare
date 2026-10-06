# White-Label Daycare Management SaaS — Phase 1 Prototype

A high-fidelity, interactive frontend for a **multi-tenant, white-label daycare management platform** built by Vision Forge Ltd. Each daycare (tenant) gets its own name, logo, colors, contact details, receipts and kiosk greeting — all from configuration, from one codebase.

> **Little Stars Daycare** ("Learn • Play • Grow") is **sample tenant data only**. No customer-facing screen hard-codes it, and no Vision Forge branding appears in the tenant UI.

Phase 1 is deliberately frontend-only: realistic mock data behind a data-access layer that Phase 2 replaces with Cloudflare D1 / R2.

---

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict) |
| Styling | Tailwind CSS v4 + CSS design tokens (`app/globals.css`) |
| Components | shadcn/ui pattern (Radix primitives via `radix-ui`, `class-variance-authority`, `tailwind-merge`) in `components/ui` |
| Icons | lucide-react |
| Motion | `motion` (Framer Motion) — kiosk transitions, success check, confetti |
| Forms | React Hook Form + Zod (`lib/validation/schemas.ts`) |
| Charts | Recharts |
| Font | Plus Jakarta Sans (self-hosted via `@fontsource-variable`, no external font request) |

> The shadcn CLI registry wasn't reachable from the build environment, so the shadcn components were authored directly in the same structure (`components.json` is present). `npx shadcn add <component>` works normally on your machine.

## Local development

```bash
npm install
npm run dev          # http://localhost:3000
npm run lint
npx tsc --noEmit     # type-check
npm run build && npm start
```

Requires Node.js 20.9+ (Node 22 LTS recommended).

### Demo tips

- `/` is a development launcher → **Admin Dashboard** or **Front Desk Kiosk**.
- Kiosk guardian PIN: **any 4 digits** (mock). Staff time-clock PINs: `1234` Sarah Wilson, `2345` Michael Carter, `3456` Jasmine Green, `4567` David Thompson, `5678` Maria Lopez, `6789` Kevin Brooks, `7890` Angela Reyes (also shown on-screen under "Demo PINs").
- Check a child in on the kiosk, then tap **Staff: exit kiosk mode** — the dashboard updates live (events are held in an in-memory store for the session; a full page reload restores the seed).
- **Settings → Branding**: try a palette, rename the daycare, remove the logo, then **Apply to this session** — the sidebar, kiosk and receipts all re-theme.

## Routes

| Route | Purpose |
|---|---|
| `/` | Development entry point (later: tenant sign-in) |
| `/dashboard` | Greeting, live metrics, currently at daycare, activity, quick actions, alerts, charts, staff on duty |
| `/children` | Directory — search (child/guardian/phone), class + attendance filters, Add Child (RHF + Zod) |
| `/children/[id]` | Profile — Overview, Guardians, Attendance, Payments, Documents, Notes |
| `/attendance` | Daily register by date + immutable event log |
| `/staff`, `/staff/[id]` | Directory with live duty status; profile with timesheet |
| `/payments` | Balances, recent payments, Record Payment, printable receipt preview |
| `/reports` | Daily attendance, attendance history, staff hours, payments · date presets · CSV export · print-to-PDF |
| `/settings` | Organization, kiosk and receipt settings |
| `/settings/branding` | White-label branding with live preview |
| `/kiosk` | Full-screen tablet home |
| `/kiosk/check-in` | Select child → confirm → guardian PIN / name → signature → success |
| `/kiosk/check-out` | Currently In / All / By Class → pickup person + signature → success |
| `/kiosk/staff` | PIN time clock → Clock In / Clock Out / View My Hours |
| `/kiosk/children` | Read-only "who's here" view |
| `/messages`, `/calendar`, `/documents` | Labelled placeholders for post-MVP modules |

## Project structure

```
app/
  layout.tsx              root: tenant CSS vars on <html>, OrganizationProvider, DemoStoreProvider
  page.tsx                dev launcher
  (admin)/                admin shell (sidebar + top nav) and all admin routes
  kiosk/                  separate full-screen kiosk shell + flows
components/
  ui/                     shadcn-style primitives (button, card, dialog, select, tabs, table…)
  admin/                  AppSidebar, TopNavigation, nav config
  dashboard/              MetricCard, ChildCard, ActivityTimeline, QuickActions, AlertCard, StaffStatusCard, charts…
  children/ attendance/ staff/ payments/ reports/ settings/ branding/
  kiosk/                  KioskHeader, KioskActionButton, KioskChildCard, NumericKeypad, SignaturePad,
                          SuccessConfirmation, check-in / check-out / staff-clock state machines
  shared/                 OrganizationProvider, OrganizationLogo, TenantBrand, ChildAvatar, StatusBadge,
                          PageHeader, EmptyState, SearchInput, LiveClock, DemoBadge
lib/
  data/                   DATA ACCESS LAYER — the only thing pages import for data
  mock-data/              organization, children, guardians, staff, attendance, payments, activity, seed
  domain/                 pure derivation logic: attendance status, staff hours, balances
  store/demo-store.tsx    in-memory session store for kiosk/payment events (mock service)
  services/               signature storage (mock R2 upload)
  auth/                   ⚠️ mock session + mock kiosk PIN checks (clearly marked)
  theme/                  brand → CSS variable mapping, readable-foreground contrast helper
  validation/             Zod schemas shared by forms (and later server actions)
  hooks/ utils/ kiosk/
types/domain.ts           database-ready domain types (every tenant record has organizationId)
```

## Mock-data architecture

- `lib/mock-data/*` holds seed data only. Time-relative data (attendance, time clock, invoices) is generated **relative to today** in the tenant timezone with a seeded PRNG, so the demo always looks live and server/client renders agree.
- `lib/data/index.ts` is the **only** data entry point for pages. Every function takes `organizationId` and is async, so swapping to D1 doesn't change call sites.
- `lib/store/demo-store.tsx` holds attendance/time/payment events client-side for the session so kiosk actions show up on the dashboard. Nothing sensitive goes to `localStorage`.

### Event-based attendance

There is no `checkedIn` flag anywhere. `AttendanceEvent { type: "CHECK_IN" | "CHECK_OUT", eventTime, guardianId, deviceId, signatureObjectKey, … }` events are immutable; `lib/domain/attendance.ts` derives each child's status, durations, daily summaries and charts. Staff hours work the same way from `StaffTimeEvent`s (`lib/domain/staff-time.ts`). Kiosk events get a client-generated UUID so retries are idempotent (ready for offline queueing). Balances are derived from invoices − payments (`lib/domain/billing.ts`).

## White-label architecture

- **Organization config** (`types/domain.ts → Organization`): name, slug, tagline, timezone, currency, contact info, kiosk welcome, receipt identity, `branding { logoUrl, primaryColor, secondaryColor, accentColor, success/warning/danger overrides }`.
- **Tokens, not hex values.** `app/globals.css` defines `--brand-primary`, `--brand-secondary`, `--brand-accent`, `--brand-success`, `--brand-warning`, `--brand-danger` (+ `-foreground`) and maps them to Tailwind utilities (`bg-brand`, `text-brand-secondary`, `bg-success/10`, …) and to shadcn's `--primary` etc.
- **Server-rendered theme:** the root layout writes the tenant's variables inline on `<html>` — no flash of default colors. `lib/theme/brand-css-vars.ts` also picks white or navy text for any brand color (WCAG contrast).
- **`useOrganization()`** gives client components the tenant; components render `organization.name`, never a literal name. The branding page previews by scoping CSS variables to the preview container, and can apply changes app-wide for the session.
- Neutral shell (navy ink, light canvas) stays constant so any brand palette remains coherent; status colors stay consistent for safety.

## Future: Cloudflare D1 (Phase 2)

- Drizzle ORM schema mirroring `types/domain.ts`: `organizations, organization_branding, users, organization_memberships, children, guardians, child_guardians, attendance_events, staff, staff_time_events, devices, invoices, payments, receipts, audit_logs`.
- Every tenant-owned table has `organization_id` + composite indexes (`organization_id, child_id, event_time`, etc.). Money stored as integer minor units.
- Reimplement `lib/data/*` with Drizzle queries; mutations become server actions/route handlers that re-validate with the same Zod schemas.
- Corrections are new events + `audit_logs` rows, never in-place edits.

## Future: Cloudflare R2

- Private bucket; object keys `orgs/{organizationId}/signatures/{yyyy-mm-dd}/{eventId}.png`, `orgs/{id}/children/{childId}/…`, `orgs/{id}/branding/logo.*`.
- `SignaturePad` already exports a PNG `Blob`; `lib/services/signature-storage.ts` is the seam — swap the mock for an authenticated upload route that validates type/size and stores only the key on the event.
- Admins view signatures/documents through short-lived signed URLs. Nothing public by default.

## Future: authentication & authorization

- Replace `lib/auth/mock-session.ts` with real sessions (e.g. Auth.js/Clerk/Lucia-style) and resolve the active tenant from subdomain/custom domain + membership.
- Enforce on the **server** for every query/mutation: organization membership, role (Platform Super Admin, Owner/Admin, Staff, Kiosk Device, Parent later) and record ownership. Hiding UI is not security.
- Kiosks authenticate as registered **devices** with attendance/time-clock permissions only; device + org IDs come from the session, not the client.
- Guardian and staff PINs stored as salted hashes (argon2/bcrypt), verified server-side, rate-limited and audit-logged. `lib/auth/mock-kiosk-auth.ts` must not be reused.

## Deployment notes

- Target: Vercel (Next.js) with Cloudflare DNS; D1/R2 accessed from server code via Cloudflare bindings/HTTP API once Phase 2 begins. Secrets in environment variables only.
- All routes currently render dynamically because seed data is relative to "now"; once real data lands, cacheable routes can opt back into caching.
- The kiosk works well as a PWA added to an iPad/Android home screen (manifest + offline queue are Phase 2+).
