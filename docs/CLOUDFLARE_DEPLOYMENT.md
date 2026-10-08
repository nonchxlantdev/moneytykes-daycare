# Cloudflare deployment

How the daycare app runs on Cloudflare Workers, how it gets there from GitHub, and how to roll back. Step-by-step dashboard instructions are in [MANUAL_SETUP.md](MANUAL_SETUP.md).

## Architecture

```
Developer PC ──git push──▶ GitHub (nonchxlantdev/moneytykes-daycare, branch main)
                                 │  Workers Builds (Cloudflare's GitHub integration)
                                 ▼
                        npm run build:vinext  →  npx wrangler deploy
                                 │
                                 ▼
   visionforgestudio.app ─────┐  Cloudflare Worker "vision-forge-daycare"
   *.visionforgestudio.app/* ─┘  (vinext: the Next.js app on Vite, one Worker for every daycare)
                                 │
                                 ├── D1 binding "DB" ──▶ D1 database "daycare-db"
                                 ├── static assets (dist/client)
                                 └── R2 (later — not used yet)
```

Request path inside the Worker:

```
Request → proxy.ts (session wall, www redirect)
        → page / server action
        → lib/auth/tenant.ts  (identity + hostname → membership → role)
        → lib/server/services (Zod validation, RBAC, organization_id scoping)
        → Drizzle → lib/db/d1-executor.ts → env.DB (native binding)
```

Browser code never talks to D1.

## Why vinext (and not OpenNext)

Cloudflare's Next.js guide recommends **vinext** as the default way to run Next.js on Workers; vinext 1.0 shipped on 28 Sept 2026. `npx vinext check` on this project reported every `next/*` import, Server Actions and `proxy.ts` as supported. The changes it needed were small and non-destructive:

- `vite.config.ts` + `wrangler.jsonc` added; `next.config.ts` and the app code are unchanged.
- `package.json` became an ES module (`"type": "module"`); the seed/tenant scripts and a test helper that used `__dirname` now use `import.meta.dirname`.
- `next build` still works, so Vercel can stay as a fallback until it is retired.

OpenNext (`@opennextjs/cloudflare` 1.20.x) also supports Next 16.3.8, but its `proxy.ts` (Node middleware) support is marked experimental and `revalidatePath` needs extra cache/tag-cache bindings. vinext was the less disruptive fit.

Known vinext notes for this app:
- No incremental cache is configured (`--cdn-cache=none --data-cache=none`). Every tenant page is dynamic anyway, and `revalidatePath` after a server action re-renders correctly.
- `next/image` is served as plain `<img>` (the app already uses `unoptimized`).
- vinext is new; if a Next.js feature misbehaves on Workers only, compare with `npm run dev` (Next.js) and check the vinext release notes.

## How D1 is reached

`lib/db/index.ts` picks the transport:

| Runtime | Transport | How |
|---|---|---|
| Cloudflare Workers (`build:vinext`, `dev:vinext`) | **Native D1 binding** `env.DB` | `vite.config.ts` aliases `lib/db/d1-binding.ts` to `d1-binding.workers.ts`, which imports `env` from `cloudflare:workers`. |
| `next dev` / Vercel (legacy) | HTTP gateway Worker (`cloudflare/d1-gateway`) | Only if `D1_GATEWAY_URL` and `D1_GATEWAY_SECRET` are set. Not needed on Cloudflare. |
| Vitest | In-memory SQLite with the same migrations | `tests/helpers/sqlite-executor.ts` |

Both production transports run the same Drizzle repositories and services, so tenant isolation, RBAC, the attendance/time-clock state machines and audit logs are unchanged. Multi-statement writes still use one atomic `DB.batch()`.

The gateway Worker is legacy. Don't deploy it for Cloudflare; it can be removed together with Vercel.

## Files

| File | Purpose |
|---|---|
| `wrangler.jsonc` | Worker name `vision-forge-daycare`, compatibility date, `nodejs_compat`, static assets, D1 binding `DB`, non-secret `vars`, observability, and the (commented) production routes. **No secrets.** |
| `vite.config.ts` | vinext + `@cloudflare/vite-plugin`; the D1 binding alias. |
| `.dev.vars.example` | Names of the secrets for the local Workers runtime (`.dev.vars` is git-ignored). |
| `app/api/health/route.ts` | `GET /api/health` → `{"ok":true,"database":"ok","runtime":"workers"}` for deploy checks. Public, no tenant data. |
| `drizzle/migrations/` | Schema migrations, applied only by `npm run db:migrate:*`. |
| `scripts/tenants/create-tenant.ts` | Creates a daycare (organization + branding + owner). |

## Commands

| Command | What it does |
|---|---|
| `npm run dev:vinext` | Local dev in the Workers runtime with **local** D1 → `http://localhost:3001`, `http://mydaycare.localhost:3001` |
| `npm run build:vinext` | Production Workers build → `dist/` (what Workers Builds runs) |
| `npm run preview:vinext` | Build, then serve the real Worker locally → `http://localhost:8788` |
| `npx wrangler deploy` | Deploy the last build (what Workers Builds runs after the build) |
| `npm run deploy:vinext` | Build and deploy from your PC in one step (manual alternative to Workers Builds) |
| `npm run db:migrate:local` / `db:migrate:remote` | Apply migrations (remote asks for confirmation) |
| `npm run db:migrations:list:local` / `:remote` | Show pending migrations |
| `npm run tenant:create:local` / `tenant:create:remote` | Create a daycare (remote needs `--confirm-remote daycare-db`) |
| `npm run db:seed:local` | Little Stars **sample** data — local/staging only |
| `npm run dev` / `npm run build` | Plain Next.js (Vercel fallback; uses the legacy gateway) |

### Local Workers setup

```powershell
copy .dev.vars.example .dev.vars          # fill in SESSION_SECRET, AUTH_PASSWORD_HASH, AUTH_USER_NAME, AUTH_EMAIL
npm run db:migrate:local
npm run tenant:create:local -- --owner-email you@example.com
npm run dev:vinext
```

## Configuration and secrets

| Name | Category | Where it's set | Secret? |
|---|---|---|---|
| `DB` | D1 binding | `wrangler.jsonc` → `d1_databases` | No |
| `ASSETS` | Static assets binding | `wrangler.jsonc` → `assets` | No |
| `PLATFORM_ROOT_DOMAIN` | Server runtime variable | `wrangler.jsonc` → `vars` (`visionforgestudio.app`) | No |
| `AUTH_COOKIE_DOMAIN` | Server runtime variable | `wrangler.jsonc` → `vars` (`visionforgestudio.app`) | No |
| `SESSION_SECRET` | Secret | Worker → Settings → Variables and Secrets (type Secret); `.dev.vars` locally | **Yes** |
| `AUTH_USERS` | Secret | same / Vercel (preferred multi-login JSON) | **Yes** |
| `AUTH_PASSWORD_HASH` | Secret | same (legacy single-user when `AUTH_USERS` unset) | **Yes** |
| `AUTH_USER_NAME`, `AUTH_EMAIL` | Server runtime values | same, stored as type Secret so deploys never remove them | No |
| `D1_GATEWAY_URL`, `D1_GATEWAY_SECRET` | Vercel-only (legacy) | `.env.local` / Vercel | secret: yes |
| `SEED_ADMIN_*` | Development only | shell / `.env.local` | No |
| `CI`, `WORKERS_CI*` | Set by Workers Builds | automatic | No |

There are **no public build variables** (`NEXT_PUBLIC_*`) and no build-time secrets. Workers Builds only needs the build/deploy commands.

## Routing

- **Custom Domains** attach a Worker to one exact hostname and create its DNS record and certificate. They **do not support wildcards**, so one is used for the apex only.
- **Routes** match patterns on a zone that already has proxied DNS. `*.visionforgestudio.app/*` matches every subdomain but **not** the apex.
- So production uses both, declared in `wrangler.jsonc` (so deploys never drop them):
  - `{ "pattern": "visionforgestudio.app", "custom_domain": true }`
  - `{ "pattern": "*.visionforgestudio.app/*", "zone_name": "visionforgestudio.app" }` + a proxied wildcard DNS record `* AAAA 100::`
- Universal SSL covers `visionforgestudio.app` and `*.visionforgestudio.app` (one level), which matches `<slug>.visionforgestudio.app`.
- The `*.workers.dev` URL stays enabled (`workers_dev: true`) for testing; branch builds get preview URLs (`preview_urls: true`).

## Authentication on Cloudflare

Env logins via `AUTH_USERS` (JSON username + bcrypt hash list) or legacy `AUTH_PASSWORD_HASH`, a signed `vf_session` cookie (HS256, `SESSION_SECRET`), `proxy.ts` as the session wall. There is no OAuth provider, so there are **no callback URLs** to register anywhere.

- Cookie: `HttpOnly`, `Secure` (production), `SameSite=Lax`, `Path=/`, `Domain=visionforgestudio.app` on the production domain so one sign-in covers the platform domain and daycare subdomains; host-only on `localhost` and `*.workers.dev`.
- Sign-in on `visionforgestudio.app/login` → redirect to `https://mydaycare.visionforgestudio.app/dashboard` when the user has exactly one daycare.
- bcrypt needs the **Workers Paid** plan (the free plan's 10 ms CPU limit is too low).

## Rollback

**Bad deploy (code):**
1. Cloudflare → Workers & Pages → `vision-forge-daycare` → **Deployments**.
2. Find the last good version → **⋯** → **Rollback** → confirm. Takes effect in seconds.
3. Then fix forward (`git revert <commit>` and push), otherwise the next push redeploys the bad code.

CLI alternative: `npx wrangler rollback` (choose the version when prompted).

**Domain cutover problem (send traffic back to the previous setup):**
1. In `wrangler.jsonc`, comment out the `"routes"` block again; commit and push. Or remove both entries under Worker → **Settings → Domains & Routes**.
2. Delete the `* AAAA 100::` record.
3. Restore the DNS records from your screenshot in MANUAL_SETUP B1 (for example the Vercel records).
4. Vercel is still live (builds paused, not deleted), so it serves again as soon as DNS points back.

**Database problem:** D1 Time Travel restores to a point in time (30 days on paid plans):
`npx wrangler d1 time-travel info daycare-db` → `npx wrangler d1 time-travel restore daycare-db --timestamp=<ISO time before the problem>`.
Export a backup before risky migrations: `npx wrangler d1 export daycare-db --remote --output backup.sql` (contains children's data — keep it private, never commit it).

## Retiring Vercel (separate checklist — do not start early)

Start only after **every** box in MANUAL_SETUP Part B5 is ticked and the site has run on Cloudflare without problems for at least a week. None of this is automatic.

- [ ] Confirm no DNS record for `visionforgestudio.app` points at Vercel (DNS → Records).
- [ ] Confirm the team uses `https://visionforgestudio.app` / `https://mydaycare.visionforgestudio.app`, not the `*.vercel.app` URL.
- [ ] Vercel → project → **Settings → Domains**: remove any `visionforgestudio.app` domains (if any were added).
- [ ] Vercel → project → **Settings → Environment Variables**: delete secrets (`SESSION_SECRET`, `AUTH_PASSWORD_HASH`, `D1_GATEWAY_*`).
- [ ] Vercel → project → **Settings → Advanced → Delete Project** (type the project name to confirm).
- [ ] GitHub → repository → **Settings → Integrations / GitHub Apps** → Vercel → remove access to this repository (or uninstall if unused).
- [ ] In the code (one commit): delete `.vercel/` if present, the `cloudflare/d1-gateway` folder, `lib/db/gateway-*.ts`, `D1_GATEWAY_*` from `.env.example`, and the gateway sections of the docs. If the gateway Worker was ever deployed: Workers & Pages → `daycare-d1-gateway` → **Settings → Delete**.
