"use client";

import { useState } from "react";
import { Check, Download, FileText, Lock, ShieldCheck, StickyNote, X } from "lucide-react";
import type { ChildDocument } from "@/types/domain";
import type { ChildRecord } from "@/lib/data";
import { DemoBadge } from "@/components/shared/demo-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useOrganization } from "@/components/shared/organization-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Textarea } from "@/components/ui/input";
import { formatCalendarDate, formatDate } from "@/lib/utils";
import { GuardianRow } from "./child-overview-tab";

function Flag({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${on ? "text-success" : "text-ink-subtle"}`}>
      {on ? <Check className="size-3.5" aria-hidden="true" /> : <X className="size-3.5" aria-hidden="true" />}
      {label}
    </span>
  );
}

export function ChildGuardiansTab({ child }: { child: ChildRecord }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {child.guardians.map((gl) => (
        <Card key={gl.link.id}>
          <CardContent className="pt-5">
            <GuardianRow gl={gl} showPhone={false} />
            <div className="mt-4 flex flex-col gap-1 text-sm">
              <p className="text-ink">{gl.guardian.phone}</p>
              {gl.guardian.email && <p className="truncate text-ink-muted">{gl.guardian.email}</p>}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3">
              {gl.link.isPrimary && <Badge tone="brand">Primary</Badge>}
              <Flag on={gl.link.canPickUp} label="Authorized pickup" />
              <Flag on={gl.link.isEmergencyContact} label="Emergency contact" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const kindTone = { ENROLLMENT: "brand", MEDICAL: "danger", CONSENT: "secondary", OTHER: "neutral" } as const;

export function ChildDocumentsTab({ documents }: { documents: ChildDocument[] }) {
  const org = useOrganization();
  if (documents.length === 0) {
    return (
      <Card>
        <EmptyState icon={FileText} title="No documents yet" description="Enrollment forms, immunization records and consents will live here, stored privately." />
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-base">Documents</CardTitle>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
          <Lock className="size-3.5" aria-hidden="true" /> Private storage
        </span>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-line">
          {documents.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-ink-muted">
                <FileText className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">{d.name}</p>
                <p className="text-xs text-ink-muted">
                  Uploaded {formatDate(d.uploadedAt, org.timezone)}
                  {d.expiresOn && ` · expires ${formatCalendarDate(d.expiresOn)}`}
                </p>
              </div>
              <Badge tone={kindTone[d.kind]}>{d.kind.toLowerCase()}</Badge>
              <Button variant="outline" size="sm" disabled title="Secure signed downloads arrive with R2 storage (Phase 2)">
                <Download /> Download
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function ChildNotesTab({ child }: { child: ChildRecord }) {
  const [notes, setNotes] = useState<string[]>(child.notes ? [child.notes] : []);
  const [draft, setDraft] = useState("");
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-base">Care notes</CardTitle>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <EmptyState icon={StickyNote} title="No notes yet" className="py-8" />
          ) : (
            <ul className="flex flex-col gap-3">
              {notes.map((n, i) => (
                <li key={i} className="rounded-xl bg-muted/70 p-4 text-sm text-ink">
                  {n}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col gap-3 pt-5">
          <Label htmlFor="note">Add a note</Label>
          <Textarea id="note" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. Napped 1h 20m, ate all of lunch." />
          <Button
            disabled={!draft.trim()}
            onClick={() => {
              setNotes((prev) => [draft.trim(), ...prev]);
              setDraft("");
            }}
          >
            Save note
          </Button>
          <DemoBadge className="self-start">Not persisted</DemoBadge>
          <p className="flex items-start gap-1.5 text-xs text-ink-muted">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Notes will be audit-logged and visible to staff only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
