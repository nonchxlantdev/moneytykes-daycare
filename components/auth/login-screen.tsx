"use client";

import type { CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { PlatformLogo } from "@/components/platform/platform-logo";
import { OrganizationLogo } from "@/components/shared/organization-logo";
import type { PublicTenant } from "@/lib/server/services/public-tenant";
import { brandCssVars } from "@/lib/theme/brand-css-vars";
import { LoginForm } from "./login-form";

/**
 * Platform domain → Vision Forge sign-in chrome; welcome animation still uses
 * the daycare (`welcomeTenant`) when one is known.
 * Daycare subdomain → the daycare's own name, logo and colors (white-label).
 */
export function LoginScreen({
  tenant,
  welcomeTenant,
}: {
  tenant?: PublicTenant;
  /** Daycare branding for the post-login star/smile overlay. */
  welcomeTenant?: PublicTenant;
}) {
  const reduceMotion = useReducedMotion();
  const fade = reduceMotion ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };
  const branded = tenant ?? welcomeTenant;
  const welcome = welcomeTenant ?? tenant;

  return (
    <main
      className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10"
      style={branded ? (brandCssVars(branded.branding) as CSSProperties) : undefined}
    >
      <motion.div {...fade} transition={{ duration: 0.3 }} className="w-full max-w-[380px]">
        <div className="mb-8 flex justify-center">
          {tenant ? (
            <div className="flex items-center gap-3">
              <OrganizationLogo name={tenant.name} logoUrl={tenant.branding.logoUrl} size={48} />
              <div>
                <p className="text-xl font-extrabold tracking-tight text-ink">{tenant.name}</p>
                {tenant.tagline && <p className="text-sm text-ink-muted">{tenant.tagline}</p>}
              </div>
            </div>
          ) : (
            <PlatformLogo />
          )}
        </div>
        <div className="rounded-3xl border border-line bg-surface p-6 shadow-lift sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Sign in</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            {welcome
              ? `Sign in to open ${welcome.name}.`
              : "Enter your username and password to open the daycare dashboard."}
          </p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
      </motion.div>
    </main>
  );
}
