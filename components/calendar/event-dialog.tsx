"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EVENT_CATEGORY_LABELS } from "@/lib/mock-data/calendar";
import type { CalendarEvent, EventCategory } from "@/types/calendar";

const CATEGORIES = Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[];

export function EventDialog({
  open,
  onOpenChange,
  initial,
  defaultDate,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: CalendarEvent | null;
  defaultDate?: string;
  onSave: (event: CalendarEvent) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {open ? (
          <EventDialogForm
            key={`${initial?.id ?? "new"}-${defaultDate ?? ""}`}
            initial={initial}
            defaultDate={defaultDate}
            onSave={onSave}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EventDialogForm({
  initial,
  defaultDate,
  onSave,
  onClose,
}: {
  initial?: CalendarEvent | null;
  defaultDate?: string;
  onSave: (event: CalendarEvent) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState<EventCategory>(initial?.category ?? "activity");
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? new Date().toISOString().slice(0, 10));
  const [allDay, setAllDay] = useState(initial?.allDay ?? false);
  const [startTime, setStartTime] = useState(initial?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "10:00");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [classroomName, setClassroomName] = useState(initial?.classroomName ?? "");
  const [error, setError] = useState<string>();

  const save = () => {
    if (!title.trim()) return setError("Title is required.");
    if (!date) return setError("Date is required.");
    if (!allDay) {
      if (!startTime || !endTime) return setError("Start and end times are required.");
      if (endTime <= startTime) return setError("End time must be after start time.");
    }
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      date,
      allDay,
      startTime: allDay ? undefined : startTime,
      endTime: allDay ? undefined : endTime,
      location: location.trim() || undefined,
      classroomName: classroomName.trim() || undefined,
    });
    onClose();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{initial ? "Edit event" : "Add event"}</DialogTitle>
        <DialogDescription>Session-only calendar — changes reset on refresh.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="ev-title">Title</Label>
          <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="ev-desc">Description</Label>
          <textarea
            id="ev-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-xl border border-line bg-background px-3 py-2 text-sm outline-none focus-visible:ring-4 focus-visible:ring-ring/25"
          />
        </div>
        <div>
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as EventCategory)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {EVENT_CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="ev-date">Date</Label>
          <Input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
        </div>
        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            id="ev-allday"
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="size-4 rounded border-line"
          />
          <Label htmlFor="ev-allday">All-day event</Label>
        </div>
        {!allDay && (
          <>
            <div>
              <Label htmlFor="ev-start">Start</Label>
              <Input id="ev-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="ev-end">End</Label>
              <Input id="ev-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1" />
            </div>
          </>
        )}
        <div>
          <Label htmlFor="ev-loc">Location</Label>
          <Input id="ev-loc" value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="ev-class">Classroom</Label>
          <Input id="ev-class" value={classroomName} onChange={(e) => setClassroomName(e.target.value)} className="mt-1" placeholder="Optional" />
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={save}>
          Save
        </Button>
      </DialogFooter>
    </>
  );
}
