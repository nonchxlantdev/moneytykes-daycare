"use client";

import { useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import type { Classroom } from "@/types/domain";
import type { ChildRecord } from "@/types/domain";
import type { ChildDay } from "@/lib/domain/attendance";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { cn, fullName } from "@/lib/utils";
import { KioskChildCard } from "./kiosk-child-card";

export interface PickerFilter {
  id: string;
  label: string;
  match: (child: ChildRecord, day?: ChildDay) => boolean;
  byClass?: boolean;
}

export function KioskChildPicker({
  roster,
  classrooms,
  byChild,
  filters,
  caption,
  onSelect,
}: {
  roster: ChildRecord[];
  classrooms: Classroom[];
  byChild: Map<string, ChildDay>;
  filters: PickerFilter[];
  caption: (day?: ChildDay) => string | undefined;
  onSelect: (child: ChildRecord) => void;
}) {
  const [query, setQuery] = useState("");
  const [filterId, setFilterId] = useState(filters[0].id);
  const [classId, setClassId] = useState(classrooms[0]?.id);
  const filter = filters.find((f) => f.id === filterId) ?? filters[0];

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roster
      .filter((c) => (q ? fullName(c).toLowerCase().includes(q) : filter.match(c, byChild.get(c.id))))
      .filter((c) => !filter.byClass || q || c.classroomId === classId)
      .sort((a, b) => a.firstName.localeCompare(b.firstName));
  }, [roster, query, filter, byChild, classId]);

  const tabClass = (active: boolean) =>
    cn(
      "h-12 flex-1 rounded-xl px-4 text-base font-bold transition-colors sm:flex-none sm:px-6",
      active ? "bg-primary text-primary-foreground shadow-soft" : "bg-surface text-ink-muted border border-line hover:text-ink",
    );

  return (
    <div className="flex flex-1 flex-col gap-5">
      <SearchInput value={query} onValueChange={setQuery} size="xl" placeholder="Search by name..." label="Search children by name" className="mx-auto max-w-2xl" />
      {!query && (
        <div className="flex flex-col items-center gap-3">
          <div role="tablist" aria-label="Filter children" className="flex w-full max-w-2xl gap-2">
            {filters.map((f) => (
              <button
                key={f.id}
                role="tab"
                type="button"
                aria-selected={f.id === filterId}
                className={tabClass(f.id === filterId)}
                onClick={() => setFilterId(f.id)}
              >
                {f.label}
                {!f.byClass && <span className="ml-1.5 opacity-75">({roster.filter((c) => f.match(c, byChild.get(c.id))).length})</span>}
              </button>
            ))}
          </div>
          {filter.byClass && (
            <div className="flex flex-wrap justify-center gap-2" aria-label="Choose class">
              {classrooms.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={c.id === classId}
                  onClick={() => setClassId(c.id)}
                  className={cn(
                    "h-11 rounded-full px-5 font-semibold",
                    c.id === classId ? "bg-brand-secondary text-brand-secondary-foreground" : "border border-line bg-surface text-ink-muted",
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {visible.length === 0 ? (
        <EmptyState icon={SearchX} title="No children found" description="Try another name, or ask a staff member for help." />
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((c) => {
            const day = byChild.get(c.id);
            return (
              <li key={c.id}>
                <KioskChildCard name={fullName(c)} photoUrl={c.photoUrl} status={day?.status === "IN" ? "IN" : undefined} caption={caption(day)} onSelect={() => onSelect(c)} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
