import type { Metadata } from "next";
import Link from "next/link";
import { ShieldX } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "No permission" };

/** Shown when a signed-in member opens a page their role can't use (e.g. staff → Settings). */
export default function ForbiddenPage() {
  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-6 pt-10">
      <Card>
        <EmptyState
          icon={ShieldX}
          title="You don't have access to this page"
          description="Your role doesn't include this area. Ask the daycare owner or an admin if you need it."
          action={
            <Button asChild>
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          }
        />
      </Card>
    </div>
  );
}
