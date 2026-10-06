import Link from "next/link";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="kiosk-backdrop flex min-h-dvh items-center justify-center p-6">
      <div className="rounded-3xl border border-line bg-surface shadow-soft">
        <EmptyState
          icon={Compass}
          title="Page not found"
          description="That page doesn't exist or has moved."
          action={
            <Button asChild>
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          }
        />
      </div>
    </main>
  );
}
