/**
 * Create a daycare tenant (organization + branding + first owner).
 *
 *   npm run tenant:create:local  -- --owner-email you@example.com
 *   npm run tenant:create:remote -- --owner-email you@example.com --confirm-remote daycare-db
 *
 * Defaults create the FIRST tenant: slug "mydaycare", name "My Daycare",
 * timezone America/Belize, currency BZD. Override with:
 *   --slug sunshine --name "Sunshine Daycare" --timezone America/Belize --currency BZD
 *   --owner-auth-id password:usr_bootstrap   (the current password login)
 *   --owner-name "Your Name"
 *   --out <file>   write the SQL only
 *
 * Owner email/name fall back to AUTH_EMAIL / AUTH_USER_NAME from .env.local.
 * Safe to re-run: nothing is overwritten or duplicated. No sample data.
 */
import { join } from "node:path";
import { arg, executeSqlFile, fail, loadLocalEnv, readTarget, requireRemoteConfirmation, ROOT, writeSqlFile } from "../lib/cli";
import { buildTenantSql } from "./build-tenant";

function main() {
  loadLocalEnv();
  const target = readTarget();
  const slug = (arg("slug") || "mydaycare").trim();
  const name = arg("name") || "My Daycare";
  const ownerName = (arg("owner-name") || process.env.AUTH_USER_NAME || "Daycare Owner").trim();
  const [firstName, ...rest] = ownerName.split(/\s+/);

  let statements: string[];
  try {
    statements = buildTenantSql({
      slug,
      name,
      timezone: arg("timezone") || "America/Belize",
      currency: (arg("currency") || "BZD").toUpperCase(),
      owner: {
        authProviderId: arg("owner-auth-id") || "password:usr_bootstrap",
        email: arg("owner-email") || process.env.AUTH_EMAIL || "",
        firstName: firstName || "Daycare",
        lastName: rest.join(" "),
      },
      now: new Date(),
    });
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }

  if (target === "remote") requireRemoteConfirmation(`create the "${slug}" daycare`);
  const outFile = writeSqlFile(arg("out") || join(ROOT, "scripts", "seed", "out", `tenant-${slug}.sql`), `Create daycare tenant "${slug}" (scripts/tenants/create-tenant.ts).`, statements);
  if (arg("out") !== undefined) return;
  executeSqlFile(target, outFile);
  console.log(`\n✔ Daycare "${slug}" is ready. Open https://${slug}.<your platform domain>/ (locally: http://${slug}.localhost:3001/).`);
}

main();
