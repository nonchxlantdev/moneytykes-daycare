import type { CSSProperties } from "react";
import { Clock, LayoutDashboard, LogIn, LogOut, Smile, UsersRound } from "lucide-react";
import { OrganizationLogo } from "@/components/shared/organization-logo";
import { brandCssVars } from "@/lib/theme/brand-css-vars";
import type { UpdateBrandingInput } from "@/lib/validation/mutations";

/**
 * Live preview. Brand tokens are scoped to this container via inline
 * CSS variables, so editing doesn't repaint the whole app until the
 * admin chooses to apply.
 */
export function BrandingPreview({
  values,
  contact,
}: {
  values: UpdateBrandingInput;
  /** Contact details are edited on the Settings page; shown here for the receipt preview. */
  contact: { address: string; phone: string; email: string };
}) {
  const valid = (c: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c);
  const vars = brandCssVars({
    primaryColor: valid(values.primaryColor) ? values.primaryColor : "#2f6bea",
    secondaryColor: valid(values.secondaryColor) ? values.secondaryColor : "#7c4dff",
    accentColor: valid(values.accentColor) ? values.accentColor : "#f28c28",
  }) as CSSProperties;
  const name = values.name || "Your Daycare";

  return (
    <div style={vars} className="flex flex-col gap-4">
      {/* Admin shell */}
      <div className="overflow-hidden rounded-2xl border border-line bg-canvas shadow-soft">
        <div className="flex">
          <div className="w-44 shrink-0 border-r border-line bg-surface p-3">
            <div className="mb-4 flex items-center gap-2">
              <OrganizationLogo name={name} logoUrl={values.logoUrl || undefined} size={28} />
              <div className="min-w-0">
                <p className="truncate text-xs font-extrabold text-ink">{name}</p>
                <p className="truncate text-[10px] text-ink-muted">{values.tagline}</p>
              </div>
            </div>
            {[
              { label: "Dashboard", icon: LayoutDashboard, active: true },
              { label: "Children", icon: Smile },
              { label: "Staff", icon: UsersRound },
            ].map(({ label, icon: Icon, active }) => (
              <div
                key={label}
                className={`mb-1 flex h-7 items-center gap-2 rounded-lg px-2 text-[11px] font-semibold ${active ? "bg-primary text-primary-foreground" : "text-ink-muted"}`}
              >
                <Icon className="size-3.5" aria-hidden="true" /> {label}
              </div>
            ))}
          </div>
          <div className="flex-1 p-3">
            <p className="text-sm font-extrabold text-ink">Good Morning!</p>
            <p className="text-[10px] text-ink-muted">Here&apos;s what&apos;s happening at {name} today.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { l: "Checked In", v: "22", c: "bg-success/12 text-success" },
                { l: "Staff On Duty", v: "6", c: "bg-brand-secondary/12 text-brand-secondary" },
              ].map((m) => (
                <div key={m.l} className="rounded-xl border border-line bg-surface p-2">
                  <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold ${m.c}`}>{m.l}</span>
                  <p className="mt-1 text-lg font-extrabold text-ink">{m.v}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <span className="inline-flex h-7 items-center rounded-lg bg-primary px-3 text-[11px] font-bold text-primary-foreground">Primary</span>
              <span className="inline-flex h-7 items-center rounded-lg bg-brand-secondary px-3 text-[11px] font-bold text-brand-secondary-foreground">Secondary</span>
              <span className="inline-flex h-7 items-center rounded-lg bg-brand-accent px-3 text-[11px] font-bold text-brand-accent-foreground">Accent</span>
            </div>
          </div>
        </div>
      </div>

      {/* Kiosk */}
      <div className="kiosk-backdrop rounded-2xl border border-line p-4 shadow-soft">
        <div className="mb-3 flex items-center gap-2">
          <OrganizationLogo name={name} logoUrl={values.logoUrl || undefined} size={24} />
          <span className="text-xs font-extrabold text-ink">{name}</span>
        </div>
        <p className="text-center text-lg font-extrabold text-ink">{values.kioskWelcomeMessage || "Welcome!"}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { l: "Check In", i: LogIn, c: "bg-success text-success-foreground" },
            { l: "Check Out", i: LogOut, c: "bg-primary text-primary-foreground" },
            { l: "Time Clock", i: Clock, c: "bg-brand-secondary text-brand-secondary-foreground" },
          ].map(({ l, i: Icon, c }) => (
            <div key={l} className={`flex flex-col items-center gap-1 rounded-xl py-3 text-[11px] font-bold ${c}`}>
              <Icon className="size-4" aria-hidden="true" /> {l}
            </div>
          ))}
        </div>
      </div>

      {/* Receipt header */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
        <div className="h-1.5 bg-gradient-to-r from-primary via-brand-secondary to-brand-accent" />
        <div className="flex items-center gap-3 p-3">
          <OrganizationLogo name={name} logoUrl={values.logoUrl || undefined} size={32} />
          <div className="min-w-0 text-[11px]">
            <p className="font-extrabold text-ink">{name}</p>
            <p className="truncate text-ink-muted">{contact.address}</p>
            <p className="truncate text-ink-muted">
              {[contact.phone, contact.email].filter(Boolean).join(" · ")}
            </p>
          </div>
          <span className="ml-auto font-mono text-[11px] font-bold text-ink">RECEIPT</span>
        </div>
      </div>
    </div>
  );
}
