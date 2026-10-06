"use client";

import Link from "next/link";
import { EllipsisVertical, LogOut, Phone, UserRound } from "lucide-react";
import type { ChildAttendanceStatus } from "@/types/domain";
import { ChildAvatar } from "@/components/shared/child-avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ChildCard({
  id,
  name,
  time,
  status,
  guardianPhone,
}: {
  id: string;
  name: string;
  time?: string;
  status: ChildAttendanceStatus;
  guardianPhone?: string;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-2xl border border-line bg-surface p-2.5 pr-1.5 transition-shadow hover:shadow-soft">
      <ChildAvatar name={name} size="lg" />
      <Link href={`/children/${id}`} className="min-w-0 flex-1 rounded-md focus-visible:outline-offset-4">
        <p className="truncate text-sm font-bold text-ink group-hover:text-primary">{name}</p>
        {time && <p className="text-sm text-ink-muted tabular">{time}</p>}
      </Link>
      <StatusBadge status={status} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="rounded-lg p-1.5 text-ink-subtle hover:bg-muted hover:text-ink"
            aria-label={`Actions for ${name}`}
          >
            <EllipsisVertical className="size-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/children/${id}`}>
              <UserRound /> View profile
            </Link>
          </DropdownMenuItem>
          {status === "IN" && (
            <DropdownMenuItem asChild>
              <Link href={`/kiosk/check-out?child=${id}`}>
                <LogOut /> Check out at kiosk
              </Link>
            </DropdownMenuItem>
          )}
          {guardianPhone && (
            <DropdownMenuItem asChild>
              <a href={`tel:${guardianPhone.replace(/\s/g, "")}`}>
                <Phone /> Call guardian
              </a>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
