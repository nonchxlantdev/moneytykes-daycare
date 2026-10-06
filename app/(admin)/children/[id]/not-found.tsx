import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ChildNotFound() {
  return (
    <Card className="mx-auto max-w-xl">
      <EmptyState
        icon={SearchX}
        title="We couldn't find that child"
        description="The record may have been removed, or it belongs to a different daycare."
        action={
          <Button asChild>
            <Link href="/children">Back to children</Link>
          </Button>
        }
      />
    </Card>
  );
}
