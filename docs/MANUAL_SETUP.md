# Manual setup checklist

Everything in this file is done **by a person**, outside the code. Work top to bottom and tick each box. Every step says where to go, what to click and enter, whether a value is sensitive, what you should see, and how to check it worked.

Related docs: [CLOUDFLARE_DEPLOYMENT.md](CLOUDFLARE_DEPLOYMENT.md) (how the deployment works, rollback, Vercel retirement) and [TENANCY.md](TENANCY.md) (how daycare subdomains work).

**Values you'll use throughout**

| Thing | Value |
|---|---|
| Platform domain | `visionforgestudio.app` |
| First daycare | `mydaycare.visionforgestudio.app` (slug `mydaycare`) |
| Worker name | `vision-forge-daycare` (must match `"name"` in `wrangler.jsonc`) |
| D1 database name | `daycare-db` |
| GitHub repository | `nonchxlantdev/moneytykes-daycare` |
| Project folder | `D:\Entrepreneur\Vision Forge Ltd\Daycare\daycare_project` |

Commands below are typed in **PowerShell** opened in the project folder (File Explorer → open the folder → click the address bar → type `powershell` → Enter).

---

## Part A — Get Cloudflare running (no production traffic yet)

### [ ] A1. Install the new dependencies

1. **Where:** PowerShell in the project folder.
2. **Enter:** `npm install`
3. **Expect:** it finishes with "added … packages" (warnings are fine).
4. **Verify:** `npm run build:vinext` ends with **"Build complete."**

### [ ] A2. Upgrade Cloudflare to Workers Paid

Sign-in and staff PINs use bcrypt, which needs more CPU per request than the free plan's 10 ms limit. Without this, sign-in fails on Cloudflare.

1. **Where:** <https://dash.cloudflare.com> → sign in → choose your account.
2. **Click:** left sidebar **Workers & Pages** (under **Compute** in newer dashboards) → **Plans** (link at the top or in the right-hand panel) → **Workers Paid** → **Purchase Workers Paid**.
3. **Enter:** confirm the payment method.
4. **Sensitive:** billing only. **Save:** nothing.
5. **Expect:** the plan shows **Workers Paid** (US $5/month at the time of writing).
6. **Verify:** Workers & Pages → **Plans** shows Workers Paid as your current plan.

### [ ] A3. Sign Wrangler in to your Cloudflare account

1. **Where:** PowerShell in the project folder.
2. **Enter:** `npx wrangler login`
3. **Click:** a browser tab opens → **Allow**.
4. **Expect:** PowerShell prints "Successfully logged in".
5. **Verify:** `npx wrangler whoami` shows your email and account.

### [ ] A4. Create the D1 database (or reuse the Phase 2 one) and record its ID

1. **Check first** whether it already exists: `npx wrangler d1 list`
   - If `daycare-db` is listed, copy its **UUID** and skip to step 3.
2. **Create it:** `npx wrangler d1 create daycare-db`
   - If asked for a location, accept the default (or choose the region closest to Belize, e.g. *Eastern North America*).
   - **Expect:** output containing `"database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"`.
   - (Dashboard alternative: **Storage & Databases → D1 SQL Database → Create** → name `daycare-db` → **Create**; the ID is shown on the database page.)
3. **Edit** `wrangler.jsonc` (project root, **not** the one in `cloudflare/d1-gateway`): replace `00000000-0000-0000-0000-000000000000` with your ID.
4. **Sensitive:** no — the ID is an identifier and is committed to Git. **Save:** it is now in `wrangler.jsonc`.
5. **Verify:** `npx wrangler d1 info daycare-db` prints the database details without an error.

### [ ] A5. Create the tables in the production database

Migrations never run automatically; this is the explicit step.

1. **Enter:** `npm run db:migrate:remote`
2. **Expect:** a list with `0000_init.sql` and the question **"Ok to proceed?"** → type `y` → Enter → `0000_init.sql ✅`.
3. **Verify:** `npm run db:migrations:list:remote` says **"No migrations to apply!"**

### [ ] A6. Create the first daycare: `mydaycare`

This creates **My Daycare** (slug `mydaycare`, timezone `America/Belize`, currency BZD, status ACTIVE) and makes your sign-in its **Owner**. It adds no sample children.

1. **Enter** (replace the email and name with yours):
   ```powershell
   npm run tenant:create:remote -- --owner-email you@example.com --owner-name "Your Name" --confirm-remote daycare-db
   ```
2. **Sensitive:** your email only. **Save:** nothing.
3. **Expect:** `✔ Daycare "mydaycare" is ready.`
4. **Verify:**
   ```powershell
   npx wrangler d1 execute DB --remote --command "SELECT slug, name, status, timezone FROM organizations"
   ```
   shows `mydaycare | My Daycare | ACTIVE | America/Belize`. Re-running the create command is safe (nothing is duplicated).

> Do **not** run `db:seed:remote` against this database — the seed adds the *Little Stars* sample data. It is for local/staging only.

### [ ] A7. Keep Vercel serving the current version while you test

Vercel deploys whatever is pushed to `main`. The new code no longer uses Vercel's setup, so pause Vercel **builds** (the live Vercel site keeps running unchanged as your fallback).

1. **Where:** <https://vercel.com> → your daycare project.
2. **Click:** **Settings** → **Git** → section **Ignored Build Step**.
3. **Enter:** set **Behavior** to **Don't build anything** (if your dashboard shows a command box instead, choose **Run my custom script** and enter `exit 0`). → **Save**.
4. **Sensitive:** no.
5. **Expect:** future pushes show as **Canceled / Ignored** in Vercel's Deployments list; the current Production deployment stays **Ready**.
6. **Verify:** after step A8, Vercel → **Deployments** shows the new commit as ignored, and your Vercel URL still works as before.

### [ ] A8. Commit and push the code to GitHub

1. **Where:** PowerShell in the project folder.
2. **Enter:**
   ```powershell
   git status
   git add -A
   git commit -m "Run the app on Cloudflare Workers with subdomain tenancy"
   git push origin main
   ```
   `git status` must **not** list `.env.local`, `.dev.vars` or `cloudflare/d1-gateway/.dev.vars` (they are ignored). If it does, stop and remove them from the commit.
3. **Expect:** the push succeeds. (This also pushes your two earlier Phase 2 commits.)
4. **Verify:** <https://github.com/nonchxlantdev/moneytykes-daycare> shows the new commit on `main`, and contains `wrangler.jsonc` and `vite.config.ts`.

### [ ] A9. Connect GitHub to Cloudflare (Workers Builds) — creates the Worker

1. **Where:** Cloudflare dashboard → **Workers & Pages** → **Create** (or **Create application**).
2. **Click:** **Import a repository** → **Get started** → **Connect GitHub** (first time only: authorise the Cloudflare app on GitHub and allow it access to `moneytykes-daycare`).
3. **Select** repository `nonchxlantdev/moneytykes-daycare`.
4. **Enter** on the configuration screen:

   | Field | Value |
   |---|---|
   | Project name | `vision-forge-daycare` (must match `wrangler.jsonc`, or the build fails) |
   | Production branch | `main` |
   | Build command | `npm run build:vinext` |
   | Deploy command | `npx wrangler deploy` |
   | Non-production branch deploy command | `npx wrangler versions upload` |
   | Path / Root directory | `/` (leave empty) |
   | Build variables | none needed |

5. **Click:** **Save and Deploy** (or **Deploy**).
6. **Sensitive:** no. **Save:** note the `*.workers.dev` address shown after the deploy.
7. **Expect:** the build log ends with "Build complete." then "Deployed vision-forge-daycare" and a URL like `https://vision-forge-daycare.<your-subdomain>.workers.dev`. Sign-in won't work yet — the secrets come next.
8. **Verify:** open `https://vision-forge-daycare.<your-subdomain>.workers.dev/api/health` → `{"ok":true,"database":"ok","runtime":"workers"}`. If `database` is `unavailable`, recheck A4/A5.

Later settings live at: Workers & Pages → `vision-forge-daycare` → **Settings** → **Build**.

### [ ] A10. Add the runtime secrets

1. **Where:** Workers & Pages → `vision-forge-daycare` → **Settings** → **Variables and Secrets** → **Add**.
2. **Enter** each of these with **Type = Secret** (secrets survive every deploy; plain "Text" variables added in the dashboard are replaced by `wrangler.jsonc` on the next deploy):

   | Variable name | Value | Sensitive? |
   |---|---|---|
   | `SESSION_SECRET` | A **new** random value, at least 32 characters. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Use a different one than Vercel/local. | **Yes** |
   | `AUTH_USERS` | Preferred. JSON array of `{ "username", "passwordHash", "name?" }`. Generate each hash: `npm run hash-password -- "your-password"`. Paste hashes **exactly** as printed (no `\$` escapes). | **Yes** |
   | `AUTH_PASSWORD_HASH` | Legacy single-user hash when `AUTH_USERS` is unset. Same paste rules as above. | Only if no `AUTH_USERS` |
   | `AUTH_USER_NAME` | Your display name, e.g. `Glenrick Spain` | No (stored as Secret only so deploys don't remove it) |
   | `AUTH_EMAIL` | The email you used in step A6 | No (same reason) |

3. **Click:** **Deploy** (or **Save and deploy**) after adding them.
4. **Save:** store the site password and `SESSION_SECRET` in your password manager. Cloudflare will not show secret values again.
5. **Expect:** the four names listed as type **Secret** with values hidden.
6. **Verify:** open the workers.dev URL → sign in with the site password → you land on **My Daycare**'s dashboard.

`PLATFORM_ROOT_DOMAIN` and `AUTH_COOKIE_DOMAIN` are **not** set here — they are plain configuration in `wrangler.jsonc` (`vars`).

### [ ] A11. Test everything on the workers.dev URL (before any DNS change)

Use `https://vision-forge-daycare.<your-subdomain>.workers.dev`. Tick each one:

- [ ] `/api/health` returns `"database":"ok"` and `"runtime":"workers"`
- [ ] `/login` loads; wrong password is rejected; right password signs in
- [ ] Reload the dashboard: still signed in (session persists)
- [ ] Dashboard shows **My Daycare** (the name from the database)
- [ ] **Children → Add Child** creates a child; reload → still there
- [ ] Child profile → **Guardians → Add guardian** saves
- [ ] **Staff → Add Staff** with a 4-digit PIN saves
- [ ] **Kiosk → Check In** the new child → "Checked In!"; trying again says "already checked in"
- [ ] **Kiosk → Check Out** → "Checked Out!"
- [ ] **Kiosk → Staff Time Clock** with the PIN → Clock In, then Clock Out
- [ ] **Settings** → change the phone → Save → reload → kept
- [ ] **Settings → Branding** → change a color → Save → whole app re-themes
- [ ] Sidebar account menu → **Sign out** → back at `/login`

Workers logs for errors: Workers & Pages → `vision-forge-daycare` → **Observability** (or **Logs**) → **Live**.

---

## Part B — Production cutover to `visionforgestudio.app`

Do Part B only after every box in A11 is ticked.

### [ ] B1. Check existing DNS records (and note them for rollback)

1. **Where:** Cloudflare dashboard → **Domains** (or **Websites**) → `visionforgestudio.app` → **DNS** → **Records**.
2. **Look for** records named `visionforgestudio.app` (shown as `@` or the domain itself), `www`, `*` or `mydaycare` of type **A, AAAA or CNAME**.
3. **Save:** take a screenshot of the list — this is your rollback record.
4. **If any of those exist** (for example pointing at Vercel `76.76.21.21` / `cname.vercel-dns.com`, or a registrar parking page): delete them now (**Edit → Delete**). The Worker needs those names free. Leave MX/TXT records alone.
5. **Expect:** no A/AAAA/CNAME records for the apex, `www`, `*` or `mydaycare`.

### [ ] B2. Add the wildcard DNS record for all daycares

Worker **Custom Domains cannot be wildcards**, so subdomains use a proxied wildcard DNS record plus a Worker **Route**.

1. **Where:** same **DNS → Records** page → **Add record**.
2. **Enter:**

   | Field | Value |
   |---|---|
   | Type | `AAAA` |
   | Name | `*` |
   | IPv6 address | `100::` |
   | Proxy status | **Proxied** (orange cloud ON) |
   | TTL | Auto |

3. **Click:** **Save**.
4. **Sensitive:** no.
5. **Expect:** a record `*.visionforgestudio.app  AAAA  100::  Proxied`. (`100::` is a "discard" address; traffic never reaches it because the Worker answers first.)
6. **Verify:** it appears in the list with an orange cloud. No record per daycare is ever needed.

### [ ] B3. SSL/TLS settings

`.app` domains are HTTPS-only in every browser, so the certificate must be active before anyone can open the site.

1. **Where:** `visionforgestudio.app` → **SSL/TLS** → **Overview** → set encryption mode to **Full (strict)**.
2. **Then:** **SSL/TLS → Edge Certificates**:
   - **Always Use HTTPS** → **On**
   - **Minimum TLS Version** → **TLS 1.2**
   - Under **Edge Certificates**, the **Universal** certificate should be **Active** and list `visionforgestudio.app` and `*.visionforgestudio.app`.
3. **Expect:** Universal certificate status **Active** (new zones can take from a few minutes up to 24 hours).
4. **Verify:** the certificate row shows both hostnames. Universal SSL covers one level of subdomains — exactly the `<daycare>.visionforgestudio.app` pattern.

### [ ] B4. Turn on the production routes (in code)

The domains are declared in `wrangler.jsonc` so every deploy keeps them.

1. **Edit** `wrangler.jsonc`: add a comma after the closing `]` of `"d1_databases"`, then remove the `//` in front of the four `"routes"` lines so the end of the file reads:
   ```jsonc
     "d1_databases": [ … ],
     "routes": [
       { "pattern": "visionforgestudio.app", "custom_domain": true },
       { "pattern": "*.visionforgestudio.app/*", "zone_name": "visionforgestudio.app" }
     ]
   }
   ```
2. **Verify locally:** `npm run build:vinext` then `npx wrangler deploy --dry-run` — it must finish with "--dry-run: exiting now." and no errors.
3. **Commit and push:**
   ```powershell
   git add wrangler.jsonc
   git commit -m "Serve visionforgestudio.app and daycare subdomains from Cloudflare"
   git push origin main
   ```
4. **Expect:** Workers & Pages → `vision-forge-daycare` → **Deployments** shows a new successful build.
5. **Verify:** **Settings → Domains & Routes** lists:
   - `visionforgestudio.app` — **Custom domain** (Cloudflare created its DNS record and certificate automatically)
   - `*.visionforgestudio.app/*` — **Route**, zone `visionforgestudio.app`

   If the custom domain fails with "existing DNS record", go back to B1.

### [ ] B5. Production verification

- [ ] `https://visionforgestudio.app/api/health` → `"database":"ok"`, `"runtime":"workers"`
- [ ] `https://visionforgestudio.app` → **Vision Forge** sign-in (not a daycare)
- [ ] `https://www.visionforgestudio.app` → redirects to `https://visionforgestudio.app`
- [ ] Sign in on `https://visionforgestudio.app/login` → lands on `https://mydaycare.visionforgestudio.app/dashboard`
- [ ] `https://mydaycare.visionforgestudio.app/login` shows **My Daycare** branding
- [ ] `https://mydaycare.visionforgestudio.app/kiosk` works (check in / out, time clock)
- [ ] `https://fakecompany.visionforgestudio.app` → **"Daycare not found"**, no other daycare's data
- [ ] Browser DevTools → Application → Cookies → `vf_session` has Domain `.visionforgestudio.app`, **HttpOnly**, **Secure**, SameSite **Lax**
- [ ] Sign out on the daycare subdomain → also signed out on `visionforgestudio.app`
- [ ] Repeat the A11 data checks on `mydaycare.visionforgestudio.app`

When all pass, tick **Cloudflare production verified** below.

---

## Part C — Status

- [ ] Cloudflare Worker created (A9)
- [ ] GitHub repository connected, production branch `main` (A9)
- [ ] D1 database connected (A4, A5, `/api/health` ok)
- [ ] Environment secrets added (A10)
- [ ] mydaycare tenant created (A6)
- [ ] Login, dashboard and kiosk tested on workers.dev (A11)
- [ ] Root domain configured (B4)
- [ ] Wildcard DNS configured (B2)
- [ ] Worker route configured (B4)
- [ ] Vercel still active as fallback (A7)
- [ ] Cloudflare production verified (B5)
- [ ] Vercel retirement approved — **only** after the above; follow the separate checklist in [CLOUDFLARE_DEPLOYMENT.md § Retiring Vercel](CLOUDFLARE_DEPLOYMENT.md#retiring-vercel-separate-checklist--do-not-start-early)

---

## Part D — Everyday operations

### Add another daycare (e.g. `sunshine`)

1. `npm run tenant:create:remote -- --slug sunshine --name "Sunshine Daycare" --owner-email owner@example.com --confirm-remote daycare-db`
2. Open `https://sunshine.visionforgestudio.app` — no DNS, Worker or deploy changes are needed.

Slug rules and reserved names: [TENANCY.md](TENANCY.md#slugs).

### Change the site password

1. `npm run hash-password -- "new-password"`
2. Worker → **Settings → Variables and Secrets** → `AUTH_PASSWORD_HASH` → **Edit** → paste → **Deploy**.
3. Verify by signing in with the new password.

### Sign everyone out

Replace `SESSION_SECRET` the same way with a new random value. All existing sessions become invalid.

### Database schema changes

`npm run db:generate` → review the new SQL in `drizzle/migrations` → `npm run db:migrate:local` → test → commit → **`npm run db:migrate:remote` before pushing the code that needs it**.

### Rollback

See [CLOUDFLARE_DEPLOYMENT.md § Rollback](CLOUDFLARE_DEPLOYMENT.md#rollback).
