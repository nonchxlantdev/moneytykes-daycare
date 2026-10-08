"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildCalendarSeed } from "@/lib/mock-data/calendar";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types/calendar";
import { EventDialog } from "./event-dialog";
import {
  EVENT_CATEGORY_META,
  addDaysDate,
  monthMatrix,
  parseDateKey,
  startOfWeek,
  toDateKey,
} from "./calendar-meta";

type View = "month" | "week" | "day";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarCenter() {
  const [events, setEvents] = useState<CalendarEvent[]>(() => buildCalendarSeed());
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const todayKey = toDateKey(new Date());

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? "") || a.title.localeCompare(b.title));
    }
    return map;
  }, [events]);

  const heading = useMemo(() => {
    if (view === "month") {
      return cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    if (view === "week") {
      const start = startOfWeek(cursor);
      const end = addDaysDate(start, 6);
      return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return parseDateKey(selectedDate).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [view, cursor, selectedDate]);

  const navigate = (dir: -1 | 1) => {
    if (view === "month") setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
    else if (view === "week") setCursor(addDaysDate(cursor, dir * 7));
    else {
      const next = addDaysDate(parseDateKey(selectedDate), dir);
      setSelectedDate(toDateKey(next));
      setCursor(next);
    }
  };

  const goToday = () => {
    const t = new Date();
    setCursor(t);
    setSelectedDate(toDateKey(t));
  };

  const saveEvent = (event: CalendarEvent) => {
    setEvents((prev) => {
      const i = prev.findIndex((e) => e.id === event.id);
      if (i === -1) return [...prev, event];
      const next = [...prev];
      next[i] = event;
      return next;
    });
    setSelectedDate(event.date);
  };

  const selectedEvents = eventsByDate.get(selectedDate) ?? [];
  const upcoming = useMemo(
    () =>
      [...events]
        .filter((e) => e.date >= todayKey)
        .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? "").localeCompare(b.startTime ?? ""))
        .slice(0, 6),
    [events, todayKey],
  );

  const weekDays = useMemo(() => {
    const start = startOfWeek(view === "day" ? parseDateKey(selectedDate) : cursor);
    return Array.from({ length: 7 }, (_, i) => addDaysDate(start, i));
  }, [cursor, selectedDate, view]);

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4 animate-in fade-in-0 duration-500">
      <PageHeader
        title="Calendar"
        description="Activities, meetings and closures — session demo (not saved)."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            <Plus /> Add Event
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-xl border border-line bg-surface p-1">
          {(["month", "week", "day"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "h-8 rounded-lg px-3 text-sm font-semibold capitalize",
                view === v ? "bg-primary text-primary-foreground" : "text-ink-muted hover:text-ink",
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="icon-sm" onClick={() => navigate(-1)} aria-label="Previous">
            <ChevronLeft />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button type="button" variant="outline" size="icon-sm" onClick={() => navigate(1)} aria-label="Next">
            <ChevronRight />
          </Button>
        </div>
        <p className="text-sm font-bold text-ink sm:ml-2">{heading}</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {view === "month" && (
              <div className="grid grid-cols-7">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="border-b border-line px-2 py-2 text-center text-[11px] font-semibold text-ink-subtle uppercase">
                    {d}
                  </div>
                ))}
                {monthMatrix(cursor).map((day) => {
                  const key = toDateKey(day);
                  const inMonth = day.getMonth() === cursor.getMonth();
                  const dayEvents = eventsByDate.get(key) ?? [];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDate(key)}
                      className={cn(
                        "min-h-24 border-b border-r border-line p-1.5 text-left transition-colors hover:bg-muted/60",
                        !inMonth && "bg-muted/30 text-ink-subtle",
                        key === selectedDate && "bg-primary/8 ring-2 ring-inset ring-primary/30",
                        key === todayKey && "font-extrabold",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex size-7 items-center justify-center rounded-full text-xs",
                          key === todayKey && "bg-primary text-primary-foreground",
                        )}
                      >
                        {day.getDate()}
                      </span>
                      <ul className="mt-1 space-y-0.5">
                        {dayEvents.slice(0, 3).map((e) => (
                          <li
                            key={e.id}
                            className={cn("truncate rounded px-1 py-0.5 text-[10px] font-semibold", EVENT_CATEGORY_META[e.category].tone)}
                          >
                            {e.title}
                          </li>
                        ))}
                        {dayEvents.length > 3 && (
                          <li className="text-[10px] font-semibold text-ink-muted">+{dayEvents.length - 3} more</li>
                        )}
                      </ul>
                    </button>
                  );
                })}
              </div>
            )}

            {view === "week" && (
              <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-7 sm:divide-x sm:divide-y-0">
                {weekDays.map((day) => {
                  const key = toDateKey(day);
                  const dayEvents = eventsByDate.get(key) ?? [];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDate(key)}
                      className={cn("min-h-40 p-3 text-left hover:bg-muted/50", key === selectedDate && "bg-primary/8")}
                    >
                      <p className={cn("text-xs font-semibold text-ink-muted", key === todayKey && "text-primary")}>
                        {day.toLocaleDateString("en-US", { weekday: "short", day: "numeric" })}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {dayEvents.map((e) => (
                          <li key={e.id} className={cn("rounded-lg px-2 py-1 text-xs font-semibold", EVENT_CATEGORY_META[e.category].tone)}>
                            {e.allDay ? "All day" : e.startTime} · {e.title}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            )}

            {view === "day" && (
              <div className="p-4">
                {selectedEvents.length === 0 ? (
                  <EmptyState
                    icon={EVENT_CATEGORY_META.activity.icon}
                    title="Nothing scheduled"
                    description="Add an event for this day."
                    action={
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditing(null);
                          setEditorOpen(true);
                        }}
                      >
                        <Plus /> Add Event
                      </Button>
                    }
                  />
                ) : (
                  <ul className="space-y-2">
                    {selectedEvents.map((e) => (
                      <EventRow
                        key={e.id}
                        event={e}
                        onOpen={() => {
                          setEditing(e);
                          setEditorOpen(true);
                        }}
                        onDelete={() => setDeleteId(e.id)}
                      />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {parseDateKey(selectedDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedEvents.length === 0 ? (
                <p className="text-sm text-ink-muted">No events this day.</p>
              ) : (
                selectedEvents.map((e) => (
                  <EventRow
                    key={e.id}
                    event={e}
                    onOpen={() => {
                      setEditing(e);
                      setEditorOpen(true);
                    }}
                    onDelete={() => setDeleteId(e.id)}
                  />
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcoming.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    setSelectedDate(e.date);
                    setEditing(e);
                    setEditorOpen(true);
                  }}
                  className="flex w-full flex-col rounded-xl border border-line px-3 py-2 text-left hover:bg-muted/60"
                >
                  <span className="text-sm font-bold text-ink">{e.title}</span>
                  <span className="text-xs text-ink-muted">
                    {e.date}
                    {!e.allDay && e.startTime ? ` · ${e.startTime}` : " · All day"}
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Categories</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(Object.keys(EVENT_CATEGORY_META) as Array<keyof typeof EVENT_CATEGORY_META>).map((key) => {
                const meta = EVENT_CATEGORY_META[key];
                const Icon = meta.icon;
                return (
                  <span key={key} className={cn("inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold", meta.tone)}>
                    <Icon className="size-3.5" aria-hidden="true" />
                    {meta.label}
                  </span>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      <EventDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initial={editing}
        defaultDate={selectedDate}
        onSave={saveEvent}
      />

      <Dialog open={Boolean(deleteId)} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete event?</DialogTitle>
            <DialogDescription>This only removes it from the current session.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (deleteId) setEvents((prev) => prev.filter((e) => e.id !== deleteId));
                setDeleteId(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventRow({ event, onOpen, onDelete }: { event: CalendarEvent; onOpen: () => void; onDelete: () => void }) {
  const meta = EVENT_CATEGORY_META[event.category];
  const Icon = meta.icon;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-line p-2.5">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-start gap-2 text-left">
        <span className={cn("mt-0.5 flex size-8 items-center justify-center rounded-lg", meta.tone)}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-ink">{event.title}</span>
          <span className="block text-xs text-ink-muted">
            {event.allDay ? "All day" : `${event.startTime} – ${event.endTime}`}
            {event.location ? ` · ${event.location}` : ""}
          </span>
        </span>
      </button>
      <Button type="button" variant="ghost" size="icon-sm" onClick={onDelete} aria-label={`Delete ${event.title}`}>
        <Trash2 className="size-4 text-danger" />
      </Button>
    </div>
  );
}
