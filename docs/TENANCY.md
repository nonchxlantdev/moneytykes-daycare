# Subdomain tenancy

Every daycare is one row in `organizations` and is reached at its own subdomain of the platform domain. All daycares run the **same** Worker, the same code and the same D1 database; data is separated by `organization_id`.

| Address | What it is |
|---|---|
| `visionforgestudio.app` | **Platform** — Vision Forge sign-in. Never a daycare. |
| `www.visionforgestudio.app` | Redirects (308) to `visionforgestudio.app`. |
| `mydaycare.visionforgestudio.app` | Daycare whose `organizations.slug = 'mydaycare'`. |
| `mydaycare.visionforgestudio.app/dashboard`, `/children`, `/kiosk`, … | Normal app routes for that daycare. |
| `randomname.visionforgestudio.app` | No such slug → **"Daycare not found"** (HTTP 404). Never falls back to another daycare or demo data. |
| `api.`, `admin.`, `auth.`, … (reserved) | 404 — reserved for the platform. |
| `a.b.visionforgestudio.app` | 404 — only one subdomain level is valid. |

## Where the code lives

| File | Responsibility |
|---|---|
| `lib/tenancy/slug.ts` | The **only** place slug rules live: `RESERVED_SUBDOMAINS`, `validateSlug`, `normalizeSlug`. |
| `lib/tenancy/hostname.ts` | `resolveTenantFromHostname(host, PLATFORM_ROOT_DOMAIN)` → `platform` / `tenant(slug)` / `reserved` / `invalid` / `unscoped`; URL builders; cookie-domain rule. Pure functions, unit-tested. |
| `lib/tenancy/request.ts` | `getRequestTenancy()` — reads the request's `Host` header once per request (never `X-Forwarded-Host`, which clients can forge). |
| `lib/auth/tenant.ts` | Page/action guards: `requireTenantContext`, `requirePagePermission`, `getActionContext`, `platformDestination`. |
| `lib/server/tenant-context.ts` | `resolveTenantContext(db, authProviderId, { slug })` — the authorization step. |
| `lib/server/services/public-tenant.ts` | Name/branding for an **unauthenticated** sign-in page. Non-sensitive fields only. |
| `proxy.ts` | Session wall + the `www` redirect. It does not decide tenants. |

Components never parse hostnames.

## Tenant resolution is not authorization

The hostname only says **which** daycare is being asked for. Every protected page, layout and server action then does:

1. **Authenticate** — signed session cookie → identity (`auth_provider_id`).
2. **Resolve the slug** from the `Host` header.
3. **Find the organization by slug**; it must be `ACTIVE` or `TRIAL` (otherwise "Daycare not found").
4. **Find the application user** (`users.auth_provider_id`, status `ACTIVE`).
5. **Require an ACTIVE membership in that exact organization** (otherwise `/no-access`).
6. **Role → permissions** (`lib/server/permissions.ts`).
7. **Scope every query** to `ctx.organizationId`.

So a valid session for Little Stars opened on `mydaycare.visionforgestudio.app` gets `/no-access` unless the user is also a member of My Daycare, and a record id from another daycare is "not found". No route or action accepts an `organizationId` from the browser.

Server actions run the same check against the host they were posted to; actions posted to the platform domain itself are refused.

## Signing in

- **On a daycare subdomain** (`mydaycare.visionforgestudio.app/login`): the page shows that daycare's name, logo and colors. After sign-in you stay on that daycare.
- **On the platform domain** (`visionforgestudio.app/login`): after sign-in the server lists your active memberships:
  - exactly one → redirect to `https://<slug>.visionforgestudio.app/dashboard`;
  - more than one → `/select-daycare` (a simple chooser);
  - none → `/no-access`.

### Session cookie scope

| Host | Cookie `Domain` | Why |
|---|---|---|
| `visionforgestudio.app` and `*.visionforgestudio.app` | `visionforgestudio.app` (from `AUTH_COOKIE_DOMAIN`) | One sign-in on the platform domain also works on your daycare's subdomain. Access is still decided per request by membership. |
| `localhost`, `*.localhost`, `*.workers.dev`, `*.vercel.app` | none (host-only) | Browsers reject `Domain=localhost`; test hosts must not share cookies with production. |

The cookie is always `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` in production. It contains only a signed user id (HS256 with `SESSION_SECRET`) — no tokens are readable by JavaScript. Signing out clears it for the parent domain.

Note for later: because the cookie is shared by all subdomains, never host untrusted content on a `*.visionforgestudio.app` subdomain.

## Pre-cutover test URLs (`*.workers.dev`)

Before DNS is pointed at Cloudflare, the app is tested at `https://vision-forge-daycare.<account>.workers.dev`. That hostname has no daycare subdomain, so it is **unscoped**: after sign-in the app uses your **oldest active membership** (with one membership — `mydaycare` — that is exactly the daycare you'd get in production). All authorization steps above still apply. Once the production domain is live, daycare subdomains are the normal way in.

## Slugs

A slug becomes a hostname, so `validateSlug` enforces:

- 3–63 characters (DNS label limit), lowercase `a–z`, `0–9` and single hyphens;
- no leading/trailing hyphen, no `--`, no spaces, underscores or symbols;
- not reserved: `www app api admin support help status mail cdn assets static auth` plus `dashboard login kiosk platform billing docs blog email smtp ftp dev staging preview test demo localhost visionforge vision-forge`.

`normalizeSlug("Sunshine Day Care!")` → `sunshine-day-care` (a suggestion; it must still pass validation). The tenant script refuses invalid slugs before anything is written.

## Creating a daycare

```bash
# First tenant (defaults: slug mydaycare, name "My Daycare", America/Belize, BZD)
npm run tenant:create:remote -- --owner-email you@example.com --owner-name "Your Name" --confirm-remote daycare-db

# Another daycare later
npm run tenant:create:remote -- --slug sunshine --name "Sunshine Daycare" --owner-email owner@example.com --confirm-remote daycare-db
```

Creates the organization, its branding row and an ACTIVE `DAYCARE_OWNER` membership for the owner identity (default `password:usr_bootstrap`, i.e. the current site-password login). Re-running never duplicates or overwrites anything. Nothing about "My Daycare" is hard-coded in the UI — rename it any time under **Settings → Branding**; the subdomain (slug) stays the same.

No DNS change is needed per daycare: the wildcard DNS record and Worker route already send every subdomain to the Worker.

## Local development

```bash
npm run dev:vinext        # Workers runtime with local D1
# http://localhost:3001             → platform sign-in
# http://mydaycare.localhost:3001   → the mydaycare daycare
# http://nosuch.localhost:3001      → "Daycare not found"
```

Chrome, Edge and Firefox resolve `*.localhost` to your own computer, so no hosts-file edits are needed. Locally the cookie is host-only, so sign in on the daycare's own `*.localhost` address. There is no "default tenant" fallback in code: production behaves exactly the same way.

Tests: `tests/tenancy.test.ts` covers the resolver, reserved names, slug rules, cookie domain, slug-scoped membership checks and cross-tenant rejection.
