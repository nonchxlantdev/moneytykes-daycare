import { notFound, redirect } from "next/navigation";
import { getOptionalIdentity } from "@/lib/auth/credentials";
import { platformDestination } from "@/lib/auth/tenant";
import { getRequestTenancy } from "@/lib/tenancy/request";

/**
 * "/" on every host.
 *   visionforgestudio.app            → platform sign-in, or the user's daycare
 *   mydaycare.visionforgestudio.app  → that daycare's dashboard (or its sign-in)
 */
export default async function Home() {
  const tenancy = await getRequestTenancy();
  if (tenancy.resolution.kind === "reserved" || tenancy.resolution.kind === "invalid") notFound();
  const user = await getOptionalIdentity();
  if (!user) redirect("/login");
  redirect(tenancy.resolution.kind === "platform" ? await platformDestination(user.authProviderId, tenancy) : "/dashboard");
}
