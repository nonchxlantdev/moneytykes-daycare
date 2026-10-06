# White-Label Daycare Management SaaS — Phase 2 (Cloudflare D1)

A **multi-tenant, white-label daycare management platform** built by Vision Forge Ltd. Each daycare (tenant) gets its own name, logo, colors, contact details, receipts and kiosk greeting from configuration, on one codebase.

Phase 1 was a high-fidelity frontend on mock data. **Phase 2 makes the core real:** organizations, members and roles, children, guardians, staff, kiosk check-in/out, the staff time clock, branding and settings are stored in **Cloudflare D1** through Drizzle ORM, with server-side tenant isolation, role checks, validation and audit logging. Billing, documents, messaging and other modules are still mock or placeholders (see [What is still mock](#what-is-still-mock-phase-3)).

> **Little Stars Daycare** is **sample data** created by the development seed. No screen hard-codes it, and no Vision Forge branding appears inside a tenant.

---

## Contents

- [What's real in Phase 2](#whats-real-in-phase-2)
- [Architecture](#architecture)
- [Quick start (local)](#quick-start-local)
- [Environment variables](#environment-variables)
- [Database, migrations and seed](#database-migrations-and-seed)
- [Multi-tenancy and security](#multi-tenancy-and-security)
- [Roles and permissions](#roles-and-permissions)
- [Attendance and the kiosk](#attendance-and-the-kiosk)
- [Branding and settings](#branding-and-settings)
- [What is still mock (Phase 3)](#what-is-still-mock-phase-3)
- [Routes](#routes)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Authentication](#authentication)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## What's real in Phase 2

| Area | Status |
|---|---|
| Organizations, branding, settings | ✅ D1 — persisted, audit-logged, owner/admin only |
| Users, memberships, roles | ✅ D1 — identity → user → membership → organization, resolved on the server |
| Children (create, edit, status, notes, allergies, medical notes) | ✅ D1 |
| Guardians and child ↔ guardian links (primary, authorized pickup, emergency contact) | ✅ D1 |
| Staff (create, edit, status, time-clock PIN — bcrypt-hashed) | ✅ D1 |
| Kiosk check-in / check-out | ✅ D1 — event-based, idempotent, state machine, audit log |
| Staff time clock | ✅ D1 — real PIN verification on the server |
| Dashboard, attendance register, reports (attendance & staff hours) | ✅ derived from D1 events |
| Guardian kiosk PIN | ⚠️ **Simplified** — any 4 digits; labelled on screen |
| Signatures | ⚠️ Required on screen but **not stored** (`signature_object_key` stays `NULL`) |
| Payments, invoices, receipts, payment reports | 🧪 Mock (sample data generated from the real roster) |
| Documents, messages, calendar | 🗓️ Placeholders |

## Architecture

```
Browser (admin dashboard / kiosk tablet)
   │  server actions + server components (no client-side DB access)
   ▼
Next.js 16 on Vercel
   │  lib/auth          → who is signed in (signed session cookie)
   │  lib/server        → tenant context, RBAC, Zod validation, services, audit
   │  lib/db            → Drizzle ORM (sqlite-proxy driver)
   │  HMAC-signed HTTPS (D1_GATEWAY_SECRET)
   ▼
D1 gateway Worker (cloudflare/d1-gateway) ──binding──▶ Cloudflare D1
```

| Area | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Data | Cloudflare D1 (SQLite), Drizzle ORM + drizzle-kit migrations, a small gateway Worker |
| Validation | Zod (`lib/validation/mutations.ts`) — on the server for every mutation, reused by forms |
| Styling / UI | Tailwind CSS v4, shadcn/ui-style components on Radix, lucide-react, motion, Recharts |
| Forms | React Hook Form + Zod |
| Tests | Vitest + an in-memory SQLite database that applies the real migrations |

Why a gateway Worker instead of the D1 REST API: D1 is only reachable natively from Workers, and the REST API is intended for administrative use with account-wide rate limits. Details in [docs/CLOUDFLARE_SETUP.md](docs/CLOUDFLARE_SETUP.md).

**Request flow for every protected read and write:**

1. `lib/auth/credentials.ts` reads the signed session → an identity with an `auth_provider_id`.
2. `lib/server/tenant-context.ts` finds the `users` row for that id, its oldest **ACTIVE** membership, and that membership's **ACTIVE/TRIAL** organization → `{ user, organizationId, role }`.
3. A service in `lib/server/services/*` checks the permission, validates input with Zod, and runs queries that are **always** filtered by that `organizationId`.
4. Mutations write the change and an `audit_logs` row in one atomic batch, then `revalidatePath` refreshes every page.

## Quick start (local)

Requires Node.js 20.9+ (22 LTS recommended).

```bash
npm install
npm --prefix cloudflare/d1-gateway install

cp .env.example .env.local                                   # Windows: copy
cp cloudflare/d1-gateway/.dev.vars.example cloudflare/d1-gateway/.dev.vars
#   .env.local:   SESSION_SECRET, AUTH_PASSWORD_HASH, D1_GATEWAY_URL=http://127.0.0.1:8787, D1_GATEWAY_SECRET
#   .dev.vars:    GATEWAY_SECRET = the same value as D1_GATEWAY_SECRET

npm run db:migrate:local
npm run db:seed:local -- --admin-email you@example.com --admin-name "Your Name"

npm run gateway:dev      # terminal 1 — D1 gateway on http://127.0.0.1:8787
npm run dev              # terminal 2 — app on http://localhost:3000
```

Sign in with your site password. Demo staff time-clock PINs are printed by the seed (Sarah Wilson `1234`, Michael Carter `2345`, Jasmine Green `3456`, David Thompson `4567`, …). Guardian kiosk PINs accept any 4 digits.

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` · `npm run typecheck` · `npm test` | ESLint · TypeScript · Vitest |
| `npm run db:generate` | Generate a new SQL migration from `lib/db/schema` |
| `npm run db:migrate:local` / `db:migrate:remote` | Apply migrations (explicit; remote asks for confirmation) |
| `npm run db:seed:local` / `db:seed:remote` | Development seed (remote needs `--confirm-remote <db name>`) |
| `npm run gateway:dev` / `gateway:deploy` | Run / deploy the D1 gateway Worker |
| `npm run hash-password -- "…"` | bcrypt hash for `AUTH_PASSWORD_HASH` |

## Environment variables

See `.env.example`. Nothing here may be exposed to the browser (no `NEXT_PUBLIC_*` variables are used).

| Variable | Required | Purpose |
|---|---|---|
| `SESSION_SECRET` | yes | Signs the session cookie (≥ 32 chars). |
| `AUTH_PASSWORD_HASH` | yes | bcrypt hash of the site password. |
| `AUTH_USER_NAME`, `AUTH_EMAIL` | optional | Name/email of the person who signs in; used by the seed for the owner's `users` row. |
| `D1_GATEWAY_URL` | yes | Gateway Worker URL. |
| `D1_GATEWAY_SECRET` | yes | Shared HMAC secret (≥ 32 chars); equals the Worker's `GATEWAY_SECRET`. |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_AUTH_ID`, `SEED_ADMIN_NAME` | seed only | Optional seed overrides. Never set these on Vercel. |

Worker secret: `GATEWAY_SECRET` (`.dev.vars` locally, `wrangler secret put` in Cloudflare).

**Vercel:** set `D1_GATEWAY_URL`, `D1_GATEWAY_SECRET`, `SESSION_SECRET` and `AUTH_PASSWORD_HASH` for **Production**, **Preview** and **Development** (plus the optional `AUTH_USER_NAME` / `AUTH_EMAIL`). Point Preview at a staging Worker/database if you don't want previews to touch production data. Full table in [docs/CLOUDFLARE_SETUP.md § 8](docs/CLOUDFLARE_SETUP.md#8-vercel-environment-variables).

## Database, migrations and seed

**Schema** (`lib/db/schema`, one migration in `drizzle/migrations/0000_init.sql`):

| Table | Notes |
|---|---|
| `organizations` | Tenant: name, slug (unique), status, timezone, currency, structured address, phone, email, website, expected arrival time |
| `organization_branding` | 1:1 — logo URL, colors, kiosk welcome, receipt identity |
| `users` | Maps an external `auth_provider_id` (unique) to an app user. **No passwords.** |
| `organization_memberships` | `PLATFORM_ADMIN` / `DAYCARE_OWNER` / `DAYCARE_ADMIN` / `DAYCARE_STAFF`; unique (organization, user) |
| `classrooms` | Per-tenant class names |
| `children` | Enrollment status, class, allergy / medical / general notes (medical notes only selected on the profile) |
| `guardians`, `child_guardians` | Many-to-many with `is_primary`, `authorized_pickup`, `emergency_contact`; `guardians.pin_hash` reserved for Phase 3 |
| `staff` | Job title, class, employment status, `pin_hash` (bcrypt only) |
| `devices` | Registered kiosks (device auth is Phase 3) |
| `attendance_events` | Immutable CHECK_IN / CHECK_OUT events; unique (organization, `client_event_id`) |
| `staff_time_events` | Immutable CLOCK_IN / CLOCK_OUT events; unique (organization, `client_event_id`) |
| `audit_logs` | Every meaningful mutation (no secrets, no medical values) |

Every tenant table has `organization_id` and composite indexes that start with it (e.g. `attendance_events (organization_id, child_id, event_time)`).

**Time.** Instants are stored as UTC milliseconds and displayed in the organization's timezone (`lib/utils/timezone.ts` is DST-safe and never assumes the server's timezone). Birthdays and hire dates are plain `YYYY-MM-DD`.

**Migrations** are generated (`npm run db:generate`) and applied **only** by explicit commands (`npm run db:migrate:local|remote`). Nothing runs migrations automatically. The Worker refuses schema-changing SQL.

**Seed** (`scripts/seed`) — development only, never automatic, `INSERT OR IGNORE` only. Creates Little Stars Daycare (4 classes, 34 children including the eight named demo children, ~80 guardians, 8 staff with hashed PINs, a Front Desk iPad device, ~10 weekdays of history plus today), a second tenant for isolation checks, and links your identity as `DAYCARE_OWNER` by `auth_provider_id` (default `password:usr_bootstrap`). See [docs/CLOUDFLARE_SETUP.md § 7](docs/CLOUDFLARE_SETUP.md#7-seed-sample-data-development-only).

## Multi-tenancy and security

- **The browser never chooses the tenant.** No server action or schema accepts an `organizationId`; it always comes from the session → membership lookup. IDs from the browser (child, guardian, staff) are looked up **within** the caller's organization, so another tenant's ID behaves exactly like a non-existent one ("not found").
- **Server-side RBAC** on every protected read and mutation (`assertCan`). The UI only hides what the role can't use; pages for owners/admins redirect others to `/forbidden`.
- **Validation:** Zod on the server for every mutation (`lib/validation/mutations.ts`).
- **Safe errors:** services throw `AppError`s with user-safe messages; everything else becomes a generic message (`toSafeError`). SQL, stack traces, credentials and tokens are only written to server logs. Route error boundaries show a reference code only.
- **PINs:** staff PINs are bcrypt-hashed (cost 10), never returned to the client, re-verified on every clock action, and unique within an organization.
- **Sensitive data:** medical notes are only selected on the child profile for roles with `children:read-medical`; audit logs record changed field names, not values.
- **Gateway:** requests are HMAC-SHA256 signed with a 60-second window; the secret exists only on the Vercel server and in the Worker.
- **Freshness:** all tenant pages are dynamic; every mutation revalidates the layout; the dashboard, attendance and kiosk roster refresh every 30 s while visible, so another device's check-ins appear without a reload.

## Roles and permissions

| Permission | Owner | Admin | Staff |
|---|:-:|:-:|:-:|
| View children, guardians, staff, attendance | ✅ | ✅ | ✅ |
| Record attendance (kiosk) and use the staff clock | ✅ | ✅ | ✅ |
| See medical notes | ✅ | ✅ | — |
| Create/edit children and guardians | ✅ | ✅ | — |
| Manage staff (incl. PINs) | ✅ | ✅ | — |
| Payments, reports | ✅ | ✅ | — |
| Settings and branding | ✅ | ✅ | — |

`PLATFORM_ADMIN` currently has owner-level access to organizations it is a member of; cross-tenant platform tools are Phase 3. Defined in `lib/server/permissions.ts`.

## Attendance and the kiosk

- **Event-based.** There is no `checked_in` column; status is derived from the latest event.
- **State machine (server-side):** CHECK_IN only when the child's latest event is not CHECK_IN; CHECK_OUT only when it is. A second check-in/out is rejected with a clear message. The rule is enforced *inside* the insert (`INSERT … SELECT … WHERE latest = expected`), so two tablets tapping at the same moment can't both succeed. Same for CLOCK_IN / CLOCK_OUT.
- **Idempotent.** Each kiosk submission carries a client-generated `client_event_id` that is reused on retry; a repeated request returns the original event instead of creating a duplicate.
- **Audited.** Each event and its `audit_logs` row are written in one atomic batch.
- **Validated.** Withdrawn/inactive children can't be checked in; the guardian must be linked to the child, and must be an **authorized pickup** to check out.
- **No premature success.** The kiosk shows "Checked In!" / "Checked Out!" / "Clocked In!" only after the server confirms the write; failures show the server's message and keep the screen so the user can retry.
- **Guardian PIN (simplified).** Any 4 digits pass and the kiosk says so. The selected guardian is still recorded and validated on the server. Real guardian PINs use the reserved `guardians.pin_hash` column in Phase 3.
- **Staff PIN (real).** Verified against bcrypt hashes on the server; the kiosk never receives the staff list or any hash.
- **Signatures.** The kiosk still requires a signature, but the image is discarded after submission. Nothing is stored in D1 or the browser; `signature_object_key` stays `NULL` until R2 storage (Phase 3, seam in `lib/services/signature-storage.ts`).
- **Device.** The kiosk runs inside the signed-in operator's session; `device_id` is `NULL` until device authentication (Phase 3).

## Branding and settings

**Settings → Branding** (name, tagline, logo URL, primary/secondary/accent colors, kiosk welcome message) and **Settings** (legal name, website, timezone, currency, expected arrival time, structured address, phone, email, receipt identity) are saved to `organizations` / `organization_branding`, audit-logged, and restricted to owners/admins. The whole app (sidebar, kiosk, receipts) re-themes from the saved values on the next render; brand CSS variables are rendered on the server, so there is no flash of default colors. Logo **uploads** arrive with R2 — for now the logo is a site path (e.g. `/tenants/little-stars/logo.svg`) or an `https://` URL.

## What is still mock (Phase 3)

| Module | Phase 2 behaviour | Where |
|---|---|---|
| Payments, invoices, receipts | Deterministic sample data generated from the real roster; "Record payment" lives in the browser session only | `lib/mock-data/payments.ts`, `lib/store/live-data.tsx` |
| Payment reports & "payment due" alert | Built from the same sample data | `components/reports`, `lib/data/index.ts` |
| Guardian kiosk PIN | Any 4 digits | `lib/auth/mock-kiosk-auth.ts` |
| Signatures, child documents, photos, logo uploads | Not stored (R2) | `lib/services/signature-storage.ts` |
| Kiosk device authentication / offline queue | Uses the operator session; `client_event_id` is ready for offline sync | `lib/kiosk/device.ts` |
| Messages, calendar, documents pages | Labelled placeholders | `app/(admin)/{messages,calendar,documents}` |
| Inviting more users / organization switching / platform admin tools | Not built (memberships are created by the seed or SQL) | — |
| Stripe, parent portal, SMS/email, PDF generation | Not started | — |

## Routes

| Route | Purpose | Access |
|---|---|---|
| `/login` | Site-password sign-in | public |
| `/dashboard` | Metrics, who's here, activity, quick actions, alerts, charts, staff on duty | all roles |
| `/children`, `/children/[id]` | Directory and profile (overview, guardians, attendance, payments*, documents, notes) | all roles; editing owner/admin |
| `/attendance` | Daily register + event log | all roles |
| `/staff`, `/staff/[id]` | Directory, profile, timesheet; add/edit staff | all roles; editing owner/admin |
| `/payments`, `/reports` | Mock billing; reports | owner/admin |
| `/settings`, `/settings/branding` | Organization settings and branding | owner/admin |
| `/kiosk`, `/kiosk/check-in`, `/kiosk/check-out`, `/kiosk/staff`, `/kiosk/children` | Front-desk tablet | all roles |
| `/forbidden` | Signed in, role lacks access | — |
| `/no-access` | Signed in, no active membership | — |
| `/messages`, `/calendar`, `/documents` | Placeholders | all roles |

## Project structure

```
app/                        routes; (admin) and kiosk layouts load the tenant via TenantShell
components/                 UI (unchanged design); dialogs call server actions
cloudflare/d1-gateway/      the D1 gateway Worker (wrangler.jsonc, src/index.ts)
drizzle/migrations/         generated SQL migrations (committed)
docs/CLOUDFLARE_SETUP.md    Cloudflare + Vercel setup
lib/
  auth/                     session cookie, site-password login, tenant resolution for pages/actions
  db/                       Drizzle schema, client, gateway protocol + executor, repositories
  server/                   tenant context, permissions, errors, mappers, services, server actions
  data/                     cached read facade used by pages
  validation/mutations.ts   Zod schemas for every mutation
  domain/                   pure derivations: attendance status, staff hours, balances
  mock-data/payments.ts     remaining mock module (billing)
  utils/timezone.ts         UTC ↔ organization timezone
scripts/seed/               development seed (build-seed.ts is pure and tested)
tests/                      Vitest: tenant isolation, RBAC, attendance, staff time, children/guardians, gateway, seed
```

## Testing

```bash
npm test             # Vitest — in-memory SQLite with the real migrations
npm run lint
npm run typecheck
npm run build
npm --prefix cloudflare/d1-gateway run typecheck
```

The suite covers: tenant isolation with a second organization (reads, updates, links, attendance, staff PINs across tenants), RBAC for each role, the attendance and time-clock state machines (double check-in/out, idempotent retries, concurrent submissions, withdrawn children, unauthorized pickups), audit rows, PIN hashing and uniqueness, safe error mapping, the gateway's request signing and statement guard, and the seed.

## Authentication

Unchanged from Phase 1: one site password (bcrypt hash in `AUTH_PASSWORD_HASH`), a signed httpOnly session cookie (`SESSION_SECRET`), and `proxy.ts` keeping every route except `/login` behind a session. Phase 2 adds the step after sign-in: the identity `password:usr_bootstrap` is mapped to a D1 `users` row and membership. A real multi-user identity provider can replace the password login later by producing a different `auth_provider_id`; nothing else changes.

## Deployment

1. Cloudflare: create the D1 database, set `database_id`, set the Worker secret, deploy the Worker, apply migrations — [docs/CLOUDFLARE_SETUP.md](docs/CLOUDFLARE_SETUP.md) steps 2–6.
2. Create your organization and owner membership (seed for dev/staging; SQL for production — step 7).
3. Vercel: set the environment variables (step 8) and redeploy.

Vercel builds never touch the database; migrations and seeds are always manual.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "We couldn't load this page" | The app can't reach the gateway — check `D1_GATEWAY_URL`, that `npm run gateway:dev` is running locally, and the server log. |
| Redirected to `/no-access` after signing in | Your identity has no active membership. Run `npm run db:seed:local -- --admin-email …` (dev) or insert the rows (production). |
| `/forbidden` | Your role can't open that page (e.g. staff → Settings). |
| Gateway `401` in server logs | `D1_GATEWAY_SECRET` and the Worker's `GATEWAY_SECRET` differ. |
| `no such table` in server logs | Run the migrations for that database. |
| Sign-in refused | `SESSION_SECRET` / `AUTH_PASSWORD_HASH` missing or malformed (escape `$` as `\$` in `.env.local` only). |
