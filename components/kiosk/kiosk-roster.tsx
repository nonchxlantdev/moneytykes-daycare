"use client";

import { useRouter } from "next/navigation";
import type { Classroom } from "@/types/domain";
import type { ChildRecord } from "@/types/domain";
import { useOrganization } from "@/components/shared/organization-provider";
import { useChildDays } from "@/lib/hooks/use-attendance";
import { formatTime } from "@/lib/utils";
import { KioskChildPicker } from "./kiosk-child-picker";
import { KioskBackButton, KioskTitle } from "./kiosk-screen";

/** Read-only "who's here" view. Tapping a child jumps to the right action. */
export function KioskRoster({ roster, classrooms }: { roster: ChildRecord[]; classrooms: Classroom[] }) {
  const org = useOrganization();
  const router = useRouter();
  const { byChild, summary } = useChildDays(roster);

  return (
    <section className="flex flex-1 flex-col">
      <KioskTitle title="Children Today" subtitle={`${summary.present} here now · ${summary.checkedOut} picked up · ${summary.notArrived} not in yet`} />
      <KioskChildPicker
        roster={roster}
        classrooms={classrooms}
        byChild={byChild}
        filters={[
          { id: "in", label: "Here now", match: (_c, d) => d?.status === "IN" },
          { id: "all", label: "Everyone", match: () => true },
          { id: "class", label: "By class", match: () => true, byClass: true },
        ]}
        caption={(d) =>
          d?.status === "IN" && d.checkIn
            ? `In at ${formatTime(d.checkIn.eventTime, org.timezone)}`
            : d?.status === "OUT" && d.checkOut
              ? `Out at ${formatTime(d.checkOut.eventTime, org.timezone)}`
              : "Not in yet"
        }
        onSelect={(c) =>
          router.push(byChild.get(c.id)?.status === "IN" ? `/kiosk/check-out?child=${c.id}` : `/kiosk/check-in?child=${c.id}`)
        }
      />
      <div className="mt-8">
        <KioskBackButton onClick={() => router.push("/kiosk")} label="Home" />
      </div>
    </section>
  );
}
