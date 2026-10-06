import { KioskRoster } from "@/components/kiosk/kiosk-roster";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { getActiveChildRecords, getClassroomList } from "@/lib/data";

export default async function KioskChildrenPage() {
  const [roster, classrooms] = await Promise.all([getActiveChildRecords(), getClassroomList()]);
  return (
    <>
      <AutoRefresh />
      <KioskRoster roster={roster} classrooms={classrooms} />
    </>
  );
}
