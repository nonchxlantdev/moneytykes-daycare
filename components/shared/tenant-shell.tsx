import type { CSSProperties, ReactNode } from "react";
import { requireTenantContext } from "@/lib/auth/tenant";
import { getAttendanceEvents, getCurrentOrganization, getEventWindowStart, getStaffTimeEvents } from "@/lib/data";
import { isDemoDataMode } from "@/lib/demo-data/mode";
import { PERMISSIONS, ROLE_LABELS } from "@/lib/server/permissions";
import { can } from "@/lib/server/tenant-context";
import { LiveDataProvider } from "@/lib/store/live-data";
import { brandCssVars } from "@/lib/theme/brand-css-vars";
import { DemoModeBanner } from "./demo-mode-banner";
import { OrganizationProvider } from "./organization-provider";
import { ViewerProvider, type Viewer } from "./viewer-provider";

/**
 * Loads the signed-in user's tenant (from D1) and provides branding,
 * viewer permissions and the recent event window to everything inside.
 * Brand CSS variables are rendered on the server, so there's no flash of
 * default colors.
 */
export async function TenantShell({ children }: { children: ReactNode }) {
  const ctx = await requireTenantContext();
  const [organization, attendanceEvents, staffTimeEvents, windowStart] = await Promise.all([
    getCurrentOrganization(),
    getAttendanceEvents(),
    getStaffTimeEvents(),
    getEventWindowStart(),
  ]);
  const viewer: Viewer = {
    name: ctx.user.name,
    email: ctx.user.email,
    role: ctx.role,
    roleLabel: ROLE_LABELS[ctx.role],
    permissions: PERMISSIONS.filter((p) => can(ctx, p)),
  };

  return (
    <div className="contents" style={brandCssVars(organization.branding) as CSSProperties}>
      <OrganizationProvider organization={organization}>
        <ViewerProvider viewer={viewer}>
          <LiveDataProvider attendanceEvents={attendanceEvents} staffTimeEvents={staffTimeEvents} windowStart={windowStart.toISOString()}>
            {isDemoDataMode() ? <DemoModeBanner /> : null}
            {children}
          </LiveDataProvider>
        </ViewerProvider>
      </OrganizationProvider>
    </div>
  );
}
