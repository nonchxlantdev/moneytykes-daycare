"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { MembershipRole } from "@/types/domain";
import type { Permission } from "@/lib/server/permissions";

export interface Viewer {
  name: string;
  email: string;
  role: MembershipRole;
  roleLabel: string;
  permissions: Permission[];
}

const ViewerContext = createContext<Viewer | null>(null);

/**
 * The signed-in user's role/permissions, used ONLY to hide controls the
 * user can't use. Every action is re-authorized on the server.
 */
export function ViewerProvider({ viewer, children }: { viewer: Viewer; children: ReactNode }) {
  return <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>;
}

export function useViewer(): Viewer {
  const v = useContext(ViewerContext);
  if (!v) throw new Error("useViewer must be used inside <ViewerProvider>");
  return v;
}

export function useCan(permission: Permission): boolean {
  return useViewer().permissions.includes(permission);
}
