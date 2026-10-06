import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function StaffNotFound() {
  return (
    <Card className="mx-auto max-w-xl">
      <EmptyState
        icon={SearchX}
        title="We couldn't find that staff member"
        action={
          <Button asChild>
            <Link href="/staff">Back to staff</Link>
          </Button>
        }
      />
    </Card>
  );
}
