import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LoginScreen } from "@/components/auth/login-screen";
import { PostLoginWelcome } from "@/components/auth/post-login-welcome";
import { getOptionalIdentity } from "@/lib/auth/credentials";
import { peekWelcomePending } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getPrimaryPublicTenant, getPublicTenantBySlug } from "@/lib/server/services/public-tenant";
import { getRequestTenancy } from "@/lib/tenancy/request";

export async function generateMetadata(): Promise<Metadata> {
  const { resolution } = await getRequestTenancy();
  if (resolution.kind === "tenant") {
    const tenant = await getPublicTenantBySlug(getDb(), resolution.slug).catch(() => null);
    if (tenant) return { title: { absolute: `Sign in · ${tenant.name}` } };
  }
  return { title: { absolute: "Sign in · Vision Forge" }, description: "Sign in to your daycare dashboard." };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const tenancy = await getRequestTenancy();
  const { resolution } = tenancy;
  if (resolution.kind === "reserved" || resolution.kind === "invalid") notFound();

  const tenant = resolution.kind === "tenant" ? await getPublicTenantBySlug(getDb(), resolution.slug).catch(() => null) : undefined;
  if (tenant === null) notFound();

  const welcomeTenant =
    tenant ??
    (resolution.kind === "platform" || resolution.kind === "unscoped"
      ? await getPrimaryPublicTenant(getDb()).catch(() => null)
      : null);

  const welcome = welcomeTenant ?? undefined;
  const daycareName = welcome?.name ?? "your daycare";
  const accentColor = welcome?.branding.accentColor ?? "#f28c28";

  const { welcome: welcomeParam } = await searchParams;
  const user = await getOptionalIdentity();
  if (user) {
    // ?welcome=1 is set by signIn; cookie is a backup if the query is stripped.
    if (welcomeParam === "1" || (await peekWelcomePending())) {
      return <PostLoginWelcome daycareName={daycareName} accentColor={accentColor} />;
    }
    redirect("/dashboard");
  }

  return <LoginScreen tenant={tenant ?? undefined} welcomeTenant={welcome} />;
}
