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

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Planned for a later phase — rendered, but labelled. */
  later?: boolean;
}

export const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/children", label: "Children", icon: Smile },
  { href: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/staff", label: "Staff", icon: UsersRound },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/reports", label: "Reports", icon: ChartColumn },
  { href: "/messages", label: "Messages", icon: MessageSquare, later: true },
  { href: "/calendar", label: "Calendar", icon: Calendar, later: true },
  { href: "/documents", label: "Documents", icon: FileText, later: true },
  { href: "/settings", label: "Settings", icon: Settings },
];
