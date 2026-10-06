"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FileText, Link2, LoaderCircle, Pencil, Plus, ShieldCheck, Star, Trash2, UsersRound, X } from "lucide-react";
import type { ChildRecord, GuardianLink } from "@/types/domain";
import { EmptyState } from "@/components/shared/empty-state";
import { FormAlert } from "@/components/shared/form-alert";
import { useCan } from "@/components/shared/viewer-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Textarea } from "@/components/ui/input";
import { callAction } from "@/lib/client/server-form";
import { updateChildAction, updateGuardianLinkAction } from "@/lib/server/actions";
import { fullName } from "@/lib/utils";
import { GuardianRow } from "./child-overview-tab";
import { GuardianFormDialog, LinkGuardianDialog, UnlinkGuardianDialog } from "./guardian-dialogs";

type FlagKey = "isPrimary" | "authorizedPickup" | "emergencyContact";

function FlagToggle({
  on,
  label,
  editable,
  busy,
  onToggle,
}: {
  on: boolean;
  label: string;
  editable: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  const content = (
    <>
      {on ? <Check className="size-3.5" aria-hidden="true" /> : <X className="size-3.5" aria-hidden="true" />}
      {label}
    </>
  );
  const tone = on ? "text-success" : "text-ink-subtle";
  if (!editable) return <span className={`inline-flex items-center gap-1 text-xs font-semibold ${tone}`}>{content}</span>;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={busy}
      onClick={onToggle}
      className={`inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs font-semibold hover:bg-muted disabled:opacity-50 ${tone}`}
    >
      {content}
    </button>
  );
}

function GuardianCard({ gl, child, canWrite }: { gl: GuardianLink; child: ChildRecord; canWrite: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const toggle = async (key: FlagKey, value: boolean) => {
    setBusy(true);
    setError(undefined);
    const result = await callAction(() => updateGuardianLinkAction({ linkId: gl.link.id, [key]: value }));
    setBusy(false);
    if (!result.ok) return setError(result.error.message);
    router.refresh();
  };

  return (
    <Card>
      <CardContent className="pt-5">
        <GuardianRow gl={gl} showPhone={false} />
        <div className="mt-4 flex flex-col gap-1 text-sm">
          <p className="text-ink">{gl.guardian.phone}</p>
          {gl.guardian.alternatePhone && <p className="text-ink-muted">Alt: {gl.guardian.alternatePhone}</p>}
          {gl.guardian.email && <p className="truncate text-ink-muted">{gl.guardian.email}</p>}
          {gl.guardian.address && <p className="text-ink-muted">{gl.guardian.address}</p>}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3">
          {gl.link.isPrimary ? (
            <Badge tone="brand">Primary</Badge>
          ) : (
            canWrite && (
              <button
                type="button"
                disabled={busy}
                onClick={() => toggle("isPrimary", true)}
                className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs font-semibold text-ink-muted hover:bg-muted disabled:opacity-50"
              >
                <Star className="size-3.5" aria-hidden="true" /> Make primary
              </button>
            )
          )}
          <FlagToggle on={gl.link.canPickUp} label="Authorized pickup" editable={canWrite} busy={busy} onToggle={() => toggle("authorizedPickup", !gl.link.canPickUp)} />
          <FlagToggle on={gl.link.isEmergencyContact} label="Emergency contact" editable={canWrite} busy={busy} onToggle={() => toggle("emergencyContact", !gl.link.isEmergencyContact)} />
          {busy && <LoaderCircle className="size-3.5 animate-spin text-ink-subtle" aria-label="Saving" />}
        </div>
        <FormAlert message={error} className="mt-3" />
        {canWrite && (
          <div className="mt-3 flex gap-2">
            <GuardianFormDialog
              childId={child.id}
              existing={gl}
              trigger={
                <Button variant="ghost" size="sm">
                  <Pencil /> Edit
                </Button>
              }
            />
            <UnlinkGuardianDialog
              gl={gl}
              childName={fullName(child)}
              trigger={
                <Button variant="ghost" size="sm" className="text-danger hover:text-danger">
                  <Trash2 /> Remove
                </Button>
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ChildGuardiansTab({ child }: { child: ChildRecord }) {
  const canWrite = useCan("guardians:write");
  return (
    <div className="flex flex-col gap-4">
      {canWrite && (
        <div className="flex flex-wrap justify-end gap-2">
          <LinkGuardianDialog
            childId={child.id}
            linkedIds={child.guardians.map((g) => g.guardian.id)}
            trigger={
              <Button variant="outline" size="sm">
                <Link2 /> Link existing guardian
              </Button>
            }
          />
          <GuardianFormDialog
            childId={child.id}
            trigger={
              <Button size="sm">
                <Plus /> Add guardian
              </Button>
            }
          />
        </div>
      )}
      {child.guardians.length === 0 ? (
        <Card>
          <EmptyState icon={UsersRound} title="No guardians on file" description="Add at least one authorized pickup so this child can be signed out at the kiosk." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {child.guardians.map((gl) => (
            <GuardianCard key={gl.link.id} gl={gl} child={child} canWrite={canWrite} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Phase 3: documents need private R2 storage + signed URLs, so nothing is listed yet. */
export function ChildDocumentsTab() {
  return (
    <Card>
      <EmptyState
        icon={FileText}
        title="Document storage is coming soon"
        description="Enrollment forms, immunization records and consents will be uploaded to private storage in a later phase. Nothing is stored yet."
      />
    </Card>
  );
}

export function ChildNotesTab({ child }: { child: ChildRecord }) {
  const router = useRouter();
  const canWrite = useCan("children:write");
  const [draft, setDraft] = useState(child.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [savedAt, setSavedAt] = useState<number>();
  const dirty = draft.trim() !== (child.notes ?? "").trim();

  const save = async () => {
    setSaving(true);
    setError(undefined);
    const result = await callAction(() => updateChildAction({ childId: child.id, generalNotes: draft }));
    setSaving(false);
    if (!result.ok) return setError(result.error.fieldErrors?.generalNotes ?? result.error.message);
    setSavedAt(Date.now());
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-base">Care notes</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Label htmlFor="child-notes" className="sr-only">
          Care notes
        </Label>
        {canWrite ? (
          <>
            <Textarea
              id="child-notes"
              rows={6}
              maxLength={2000}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setSavedAt(undefined);
              }}
              placeholder="General notes for staff, e.g. naps best with her blue blanket."
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={!dirty || saving} onClick={save}>
                {saving && <LoaderCircle className="animate-spin" aria-hidden="true" />}
                Save notes
              </Button>
              {savedAt && !dirty && <span className="text-sm font-medium text-success">Saved</span>}
              <span className="text-xs text-ink-subtle tabular">{draft.length}/2000</span>
            </div>
            <FormAlert message={error} />
          </>
        ) : child.notes ? (
          <p className="rounded-xl bg-muted/70 p-4 text-sm whitespace-pre-wrap text-ink">{child.notes}</p>
        ) : (
          <p className="text-sm text-ink-muted">No notes yet.</p>
        )}
        <p className="flex items-start gap-1.5 text-xs text-ink-muted">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Visible to staff of this daycare only. Changes are recorded in the audit log.
        </p>
      </CardContent>
    </Card>
  );
}
