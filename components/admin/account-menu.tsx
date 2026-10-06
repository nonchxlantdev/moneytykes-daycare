"use client";

import { ChevronsUpDown, LogOut } from "lucide-react";
import { PersonAvatar } from "@/components/shared/child-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth/actions";

export function AccountMenu({ user }: { user: { name: string; roleLabel: string } }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-1 py-1 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25"
          aria-label="Account menu"
        >
          <PersonAvatar name={user.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink">{user.name}</p>
            <p className="text-xs text-ink-muted">{user.roleLabel}</p>
          </div>
          <ChevronsUpDown className="size-4 text-ink-subtle" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>Account</DropdownMenuItem>
        <form action={signOut}>
          <DropdownMenuItem asChild className="text-danger">
            <button type="submit" className="w-full">
              <LogOut aria-hidden="true" />
              Sign Out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
