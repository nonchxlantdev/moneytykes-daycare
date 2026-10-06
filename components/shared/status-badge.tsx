import { CircleCheck, CircleMinus, Clock, LogOut, Moon } from "lucide-react";
import type { ComponentProps, ElementType } from "react";
import type { ChildAttendanceStatus, StaffDutyStatus } from "@/types/domain";
import { Badge } from "@/components/ui/badge";

type Status = ChildAttendanceStatus | StaffDutyStatus;

const config: Record<Status, { label: string; tone: ComponentProps<typeof Badge>["tone"]; icon: ElementType }> = {
  IN: { label: "IN", tone: "solidSuccess", icon: CircleCheck },
  OUT: { label: "OUT", tone: "brand", icon: LogOut },
  NOT_ARRIVED: { label: "NOT IN", tone: "warning", icon: Clock },
  ON_DUTY: { label: "ON DUTY", tone: "success", icon: CircleCheck },
  OFF_DUTY: { label: "OFF DUTY", tone: "neutral", icon: Moon },
  ON_LEAVE: { label: "ON LEAVE", tone: "warning", icon: CircleMinus },
};

/** Status pill — always icon + text, never color alone. */
export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const { label, tone, icon: Icon } = config[status];
  return (
    <Badge tone={tone} className={className}>
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}
