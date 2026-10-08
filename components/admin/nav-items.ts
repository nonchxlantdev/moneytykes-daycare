import {
  Calendar,
  ChartColumn,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Smile,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/server/permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Planned for a later phase — rendered, but labelled. */
  later?: boolean;
  /** Omit from the sidebar (route may still exist). */
  hidden?: boolean;
  /** Hidden when the viewer lacks this permission (the page also enforces it server-side). */
  permission?: Permission;
}

export const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/children", label: "Children", icon: Smile },
  { href: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/staff", label: "Staff", icon: UsersRound },
  { href: "/payments", label: "Payments", icon: Wallet, permission: "payments:view" },
  { href: "/reports", label: "Reports", icon: ChartColumn, permission: "reports:view" },
  { href: "/messages", label: "Messages", icon: MessageSquare, hidden: true },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings, permission: "settings:manage" },
];
