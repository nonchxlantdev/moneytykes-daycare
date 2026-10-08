import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserX } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { getOptionalIdentity } from "@/lib/auth/credentials";
import { getRequestTenancy } from "@/lib/tenancy/request";

export const metadata: Metadata = { title: { absolute: "No daycare access" } };

/**
 * Signed in, but this identity has no active membership in an active
 * organization (e.g. the database was not seeded, or access was revoked).
 */
export default async function NoAccessPage() {
  const identity = await getOptionalIdentity();
  if (!identity) redirect("/login");
  const onDaycareAddress = (await getRequestTenancy()).resolution.kind === "tenant";
  return (
    <main className="kiosk-backdrop flex min-h-dvh items-center justify-center p-6">
      <div className="max-w-lg rounded-3xl border border-line bg-surface shadow-soft">
        <EmptyState
          icon={UserX}
          title={onDaycareAddress ? "You don't have access to this daycare" : "No daycare is linked to this account"}
          description={
            onDaycareAddress
              ? "You're signed in, but your account isn't a member of this daycare. Ask its owner to add you, or check that you opened the right address."
              : "You're signed in, but this account isn't a member of any active daycare yet. Ask the daycare owner to add you, or run the development seed if you're setting up locally."
          }
          action={
            <form action={signOut}>
              <Button type="submit" variant="outline">
                Sign out
              </Button>
            </form>
          }
        />
      </div>
    </main>
  );
}
