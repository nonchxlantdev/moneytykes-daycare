import Link from "next/link";
import type { ElementType } from "react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "./page-header";

/** Honest placeholder for modules scheduled after the MVP. */
export function PlannedFeature({
  title,
  description,
  icon: Icon,
  bullets,
}: {
  title: string;
  description: string;
  icon: ElementType;
  bullets: string[];
}) {
  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-6 animate-in fade-in-0 duration-500">
      <PageHeader title={title} description={description} eyebrow={<Badge tone="secondary">Planned · after MVP</Badge>} />
      <Card className="flex flex-col items-center gap-6 p-10 text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-brand-secondary/12 text-brand-secondary">
          <Icon className="size-8" aria-hidden="true" />
        </span>
        <ul className="flex flex-col gap-2 text-left">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-ink">
              <Check className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" /> {b}
            </li>
          ))}
        </ul>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </Card>
    </div>
  );
}
