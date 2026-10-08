# White-Label Daycare Management SaaS — on Cloudflare Workers

A **multi-tenant, white-label daycare management platform** built by Vision Forge Ltd. Each daycare (tenant) gets its own name, logo, colors, contact details, receipts and kiosk greeting from configuration, on one codebase.

Phase 1 was a high-fidelity frontend on mock data. **Phase 2 makes the core real:** organizations, members and roles, children, guardians, staff, kiosk check-in/out, the staff time clock, branding and settings are stored in **Cloudflare D1** through Drizzle ORM, with server-side tenant isolation, role checks, validation and audit logging. Billing, documents, messaging and other modules are still mock or placeholders (see [What is still mock](#what-is-still-mock-phase-3)).

**Production:** the app runs on **Cloudflare Workers** (via vinext) with a native D1 binding. Every daycare is a subdomain of the platform domain — `mydaycare.visionforgestudio.app` is the first — and all of them run the same Worker. `visionforgestudio.app` itself is the Vision Forge platform sign-in, never a daycare. Vercel stays as a paused fallback until Cloudflare is verified.

**Setting it up:** follow [docs/MANUAL_SETUP.md](docs/MANUAL_SETUP.md) (click-by-click checklist). How it works: [docs/CLOUDFLARE_DEPLOYMENT.md](docs/CLOUDFLARE_DEPLOYMENT.md) and [docs/TENANCY.md](docs/TENANCY.md).

> **Little Stars Daycare** is **sample data** created by the development seed. No screen hard-codes it, and no Vision Forge branding appears inside a tenant.

---

## Contents

- [What's real in Phase 2](#whats-real-in-phase-2)
- [Architecture](#architecture)
- [Quick start (local)](#quick-start-local)
- [Environment variables](#environment-variables)
- [Database, migrations and seed](#database-migrations-and-seed)
- [Subdomain tenancy](#subdomain-tenancy)
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
git push → GitHub → Workers Builds (npm run build:vinext → npx wrangler deploy)

Browser (admin dashboard / kiosk tablet) on visionforgestudio.app or <daycare>.visionforgestudio.app
   │  server actions + server components (no client-side DB access)
   ▼
Cloudflare Worker "vision-forge-daycare"   (Next.js app built with vinext)
   │  proxy.ts           → session wall, www → apex redirect
   │  lib/tenancy        → hostname → daycare slug (never authorization)
   │  lib/auth           → who is signed in (signed session cookie) + membership for THAT daycare
   │  lib/server         → RBAC, Zod validation, services, audit
   │  lib/db             → Drizzle ORM → native D1 binding "DB"
   ▼
Cloudflare D1 "daycare-db"
```

| Area | Choice |
|---|---|
| Framework | Next.js 16.3 (App Router), React 19, TypeScript (strict) |
| Hosting | Cloudflare Workers via **vinext** (Next.js API on Vite); `next build` still works for the Vercel fallback |
| Data | Cloudflare D1 (SQLite), Drizzle ORM + drizzle-kit migrations, native binding on Workers |
| Validation | Zod (`lib/validation/mutations.ts`) — on the server for every mutation, reused by forms |
| Styling / UI | Tailwind CSS v4, shadcn/ui-style components on Radix, lucide-react, motion, Recharts |
| Forms | React Hook Form + Zod |
| Tests | Vitest + an in-memory SQLite database that applies the real migrations |

Why vinext rather than OpenNext, and how the D1 binding is wired: [docs/CLOUDFLARE_DEPLOYMENT.md](docs/CLOUDFLARE_DEPLOYMENT.md). The old Vercel → gateway Worker → D1 path (`cloudflare/d1-gateway`) is kept only for `next dev`/Vercel until Vercel is retired.

**Request flow for every protected read and write:**

1. `lib/auth/credentials.ts` reads the signed session → an identity with an `auth_provider_id`.
2. `lib/tenancy` reads the daycare slug from the `Host` header (`mydaycare.visionforgestudio.app` → `mydaycare`).
3. `lib/server/tenant-context.ts` finds that organization (must be **ACTIVE/TRIAL**), the `users` row, and an **ACTIVE** membership **in that organization** → `{ user, organizationId, role }`. On pre-cutover test hosts (`*.workers.dev`) the oldest active membership is used.
4. A service in `lib/server/services/*` checks the permission, validates input with Zod, and runs queries that are **always** filtered by that `organizationId`.
5. Mutations write the change and an `audit_logs` row in one atomic batch, then `revalidatePath` refreshes every page.

## Quick start (local)

Requires Node.js 22.12+ (Cloudflare's build image uses Node 24).

```bash
npm install
cp .dev.vars.example .dev.vars        # Windows: copy — fill in SESSION_SECRET, AUTH_PASSWORD_HASH, AUTH_USER_NAME, AUTH_EMAIL

npm run db:migrate:local
npm run tenant:create:local -- --owner-email you@example.com    # the real first daycare, empty
npm run db:seed:local -- --admin-email you@example.com          # optional: Little Stars sample data

npm run dev:vinext       # Workers runtime + local D1
# http://localhost:3001              platform sign-in
# http://mydaycare.localhost:3001    My Daycare
# http://little-stars.localhost:3001 sample daycare (if seeded)
```

Sign in with your site password (generate its hash with `npm run hash-password -- "…"`). Demo staff time-clock PINs are printed by the seed (Sarah Wilson `1234`, Michael Carter `2345`, Jasmine Green `3456`, David Thompson `4567`, …). Guardian kiosk PINs accept any 4 digits.

| Script | What it does |
|---|---|
| `npm run dev:vinext` | Local dev in the Workers runtime (port 3001) |
| `npm run build:vinext` | Cloudflare production build (`dist/`) — used by Workers Builds |
| `npm run preview:vinext` | Build and run the real Worker locally (port 8788) |
| `npm run deploy:vinext` | Build + deploy from your PC (Workers Builds normally does this on push) |
| `npm run lint` · `npm run typecheck` · `npm test` | ESLint · TypeScript · Vitest |
| `npm run db:generate` | Generate a new SQL migration from `lib/db/schema` |
| `npm run db:migrate:local` / `db:migrate:remote` | Apply migrations (explicit; remote asks for confirmation) |
| `npm run db:migrations:list:local` / `:remote` | Pending migrations |
| `npm run tenant:create:local` / `tenant:create:remote` | Create a daycare (remote needs `--confirm-remote daycare-db`) |
| `npm run db:seed:local` / `db:seed:remote` | Sample data (remote needs `--confirm-remote`; staging only) |
| `npm run dev` / `build` / `start` | Plain Next.js (Vercel fallback; needs the legacy gateway: `npm run gateway:dev`) |
| `npm run hash-password -- "…"` | bcrypt hash for `AUTH_USERS` / `AUTH_PASSWORD_HASH` |

## Environment variables

Names only in `.env.example` / `.dev.vars.example`. No `NEXT_PUBLIC_*` variables are used, so nothing reaches the browser.

| Variable | Kind | Where (Cloudflare) | Purpose |
|---|---|---|---|
| `DB` | D1 binding | `wrangler.jsonc` | The database |
| `PLATFORM_ROOT_DOMAIN` | runtime var | `wrangler.jsonc` → `vars` | `visionforgestudio.app`; `<slug>.<this>` is a daycare |
| `AUTH_COOKIE_DOMAIN` | runtime var | `wrangler.jsonc` → `vars` | Session cookie shared by the platform domain and daycare subdomains |
| `SESSION_SECRET` | **secret** | Worker → Settings → Variables and Secrets | Signs the session cookie (≥ 32 chars) |
| `DEMO_DATA` | optional | Vercel / `.env.local` | `1` force fixture demo; `0` force DB. Auto-on when `D1_GATEWAY_*` are unset |
| `AUTH_USERS` | **secret** | same / Vercel env | JSON array of `{username,passwordHash,name?}` for multi-login (preferred) |
| `AUTH_PASSWORD_HASH` | **secret** | same | Legacy single-user bcrypt hash when `AUTH_USERS` is unset |
| `AUTH_USER_NAME`, `AUTH_EMAIL` | runtime (stored as Secret) | same | Legacy single-user name/email; also used by tenant/seed scripts |
| `D1_GATEWAY_URL`, `D1_GATEWAY_SECRET` | Vercel-only (legacy) | — | Only for `next dev` / Vercel |
| `SEED_ADMIN_*` | dev only | — | Seed overrides |

Full table with value formats: [docs/CLOUDFLARE_DEPLOYMENT.md § Configuration and secrets](docs/CLOUDFLARE_DEPLOYMENT.md#configuration-and-secrets).

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

**Seed** (`scripts/seed`) — development only, never automatic, `INSERT OR IGNORE` only. Creates Little Stars Daycare (4 classes, 34 children including the eight named demo children, ~80 guardians, 8 staff with hashed PINs, a Front Desk iPad device, ~10 weekdays of history plus today), a second tenant for isolation checks, and links your identity as `DAYCARE_OWNER` by `auth_provider_id` (default `password:usr_bootstrap`). Local/staging only — production daycares are created with `npm run tenant:create:remote` (no sample data).

## Subdomain tenancy

| Address | Result |
|---|---|
| `visionforgestudio.app` | Platform sign-in; after sign-in → your daycare (or a chooser if you belong to several) |
| `www.visionforgestudio.app` | Redirects to `visionforgestudio.app` |
| `mydaycare.visionforgestudio.app` | My Daycare — branding, data and access from its `organizations` row |
| `unknown.visionforgestudio.app` | "Daycare not found" (404) — never another daycare's data |
| reserved (`api`, `admin`, `auth`, …) | 404 |

The hostname only selects the daycare; access always requires an active membership in **that** daycare. New daycares need no DNS or deploy changes: `npm run tenant:create:remote -- --slug sunshine --name "Sunshine Daycare" --owner-email … --confirm-remote daycare-db`. Details, slug rules and cookie scope: [docs/TENANCY.md](docs/TENANCY.md).

## Multi-tenancy and security

- **The browser never chooses the tenant.** No server action or schema accepts an `organizationId`; it always comes from the session → membership lookup. IDs from the browser (child, guardian, staff) are looked up **within** the caller's organization, so another tenant's ID behaves exactly like a non-existent one ("not found").
- **Server-side RBAC** on every protected read and mutation (`assertCan`). The UI only hides what the role can't use; pages for owners/admins redirect others to `/forbidden`.
- **Validation:** Zod on the server for every mutation (`lib/validation/mutations.ts`).
- **Safe errors:** services throw `AppError`s with user-safe messages; everything else becomes a generic message (`toSafeError`). SQL, stack traces, credentials and tokens are only written to server logs. Route error boundaries show a reference code only.
- **PINs:** staff PINs are bcrypt-hashed (cost 10), never returned to the client, re-verified on every clock action, and unique within an organization.
- **Sensitive data:** medical notes are only selected on the child profile for roles with `children:read-medical`; audit logs record changed field names, not values.
- **Database access:** on Cloudflare the Worker uses the D1 binding directly; there is no database credential to leak. (The legacy gateway used for Vercel signs every request with HMAC-SHA256.)
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
| `/login` | Site-password sign-in (platform or daycare-branded) | public |
| `/select-daycare` | Platform domain: choose a daycare when you belong to several | signed in |
| `/api/health` | Deploy check: `{"ok":true,"database":"ok","runtime":"workers"}` | public |
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
wrangler.jsonc, vite.config.ts  Cloudflare Worker config + vinext build
cloudflare/d1-gateway/      legacy D1 gateway Worker (Vercel only; remove with Vercel)
drizzle/migrations/         generated SQL migrations (committed)
docs/MANUAL_SETUP.md        step-by-step setup checklist (Cloudflare, GitHub, DNS)
docs/CLOUDFLARE_DEPLOYMENT.md  architecture, commands, secrets, routing, rollback, Vercel retirement
docs/TENANCY.md             subdomain tenancy rules
docs/CLOUDFLARE_SETUP.md    legacy gateway setup (Vercel)
lib/
  auth/                     session cookie, site-password login, tenant resolution for pages/actions
  db/                       Drizzle schema, client, D1 binding executor (+ legacy gateway), repositories
  tenancy/                  hostname → daycare slug, reserved subdomains, slug rules
  server/                   tenant context, permissions, errors, mappers, services, server actions
  data/                     cached read facade used by pages
  validation/mutations.ts   Zod schemas for every mutation
  domain/                   pure derivations: attendance status, staff hours, balances
  mock-data/payments.ts     remaining mock module (billing)
  utils/timezone.ts         UTC ↔ organization timezone
scripts/tenants/            create a real daycare tenant
scripts/seed/               development sample data (build-seed.ts is pure and tested)
tests/                      Vitest: tenancy, tenant isolation, RBAC, attendance, staff time, children/guardians, D1 executor, gateway, seed
```

## Testing

```bash
npm test             # Vitest — in-memory SQLite with the real migrations
npm run lint
npm run typecheck
npm run build            # Next.js build (Vercel fallback)
npm run build:vinext     # Cloudflare Workers build
npx wrangler deploy --dry-run
```

The suite covers: tenant isolation with a second organization (reads, updates, links, attendance, staff PINs across tenants), RBAC for each role, the attendance and time-clock state machines (double check-in/out, idempotent retries, concurrent submissions, withdrawn children, unauthorized pickups), audit rows, PIN hashing and uniqueness, safe error mapping, hostname → tenant resolution, reserved/invalid slugs, cookie scope, unknown-tenant and cross-tenant rejection, the native D1 executor, the gateway's request signing, the first-tenant script and the seed.

## Authentication

Env-based logins via `AUTH_USERS` (JSON array of username + bcrypt hash; preferred) or the legacy `AUTH_USERNAME` + `AUTH_PASSWORD_HASH` pair. A signed httpOnly session cookie (`vf_session`, `SESSION_SECRET`) and `proxy.ts` keep every route except `/login` and `/api/health` behind a session. Every successful env login still maps to identity `password:usr_bootstrap` for D1 memberships (same daycare access).

**Vercel without Cloudflare:** when `D1_GATEWAY_URL` / `D1_GATEWAY_SECRET` are unset, the app auto-enters **demo data mode** (sample org, kids, staff). Only `AUTH_USERS` + `SESSION_SECRET` are required. Add the gateway vars later to switch to live D1.

On the production domain the cookie is scoped to `visionforgestudio.app` (HttpOnly, Secure, SameSite=Lax) so signing in on the platform domain also works on your daycare's subdomain; elsewhere it is host-only. There is no OAuth provider, so there are no callback URLs to configure. bcrypt requires the Workers Paid plan when using Workers.

## Deployment

Push to `main` → Cloudflare Workers Builds runs `npm run build:vinext` and `npx wrangler deploy`. One-time setup (Workers Paid, D1, migrations, first daycare, GitHub connection, secrets, DNS, routes): [docs/MANUAL_SETUP.md](docs/MANUAL_SETUP.md). Rollback and Vercel retirement: [docs/CLOUDFLARE_DEPLOYMENT.md](docs/CLOUDFLARE_DEPLOYMENT.md).

Builds never touch the database; migrations, tenants and seeds are always explicit commands.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "We couldn't load this page" | On Cloudflare: open `/api/health`; `database: unavailable` means the D1 binding/`database_id` or migrations are wrong. On Vercel without gateway: ensure the latest deploy includes demo data mode, or set `DEMO_DATA=1`. With `next dev`: the legacy gateway isn't running (or set `DEMO_DATA=1`). |
| "Daycare not found" | No ACTIVE/TRIAL organization with that slug — create it with `npm run tenant:create:remote`. |
| Redirected to `/no-access` after signing in | Your identity has no active membership in that daycare. Run `npm run tenant:create:remote -- --owner-email …` (or `:local`). |
| `/forbidden` | Your role can't open that page (e.g. staff → Settings). |
| Gateway `401` in server logs | `D1_GATEWAY_SECRET` and the Worker's `GATEWAY_SECRET` differ. |
| `no such table` in server logs | Run the migrations for that database. |
| Sign-in refused / "temporarily unavailable" | `SESSION_SECRET` / `AUTH_USERS` (or legacy `AUTH_PASSWORD_HASH`) missing or malformed (escape `$` as `\$` in `.env.local` only, never in Cloudflare, Vercel, or `.dev.vars`). On the free Workers plan bcrypt exceeds the CPU limit — upgrade to Workers Paid. |
