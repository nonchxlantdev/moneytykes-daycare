"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { callAction } from "@/lib/client/server-form";
import type { ActionResult } from "@/lib/server/errors";

/**
 * Soft-remove control for demo tenants. Does not hard-delete rows — it runs the
 * provided status action (e.g. terminate staff / withdraw child) after a clear
 * demo warning.
 */
export function DemoSoftRemove({
  label,
  subjectName,
  confirmLabel,
  onRemove,
  redirectTo,
}: {
  label: string;
  subjectName: string;
  confirmLabel: string;
  onRemove: () => Promise<ActionResult<unknown>>;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const run = async () => {
    setBusy(true);
    setError(undefined);
    const result = await callAction(onRemove);
    setBusy(false);
    if (!result.ok) return setError(result.error.message);
    setOpen(false);
    if (redirectTo) router.push(redirectTo);
    else router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setError(undefined); setOpen(next); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-danger hover:bg-danger/10">
          <Trash2 /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{confirmLabel}</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-sm text-ink-muted">
              <p className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 font-medium text-ink">
                Demo environment — this does not permanently erase records. It marks{" "}
                <strong className="text-ink">{subjectName}</strong> inactive so they leave the active
                roster and kiosk. History stays available for audit.
              </p>
              <p>You can reverse this later by editing their status.</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <FormAlert message={error} />
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={run} disabled={busy}>
            {busy ? "Updating…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
