import { KioskRoster } from "@/components/kiosk/kiosk-roster";
import { getActiveOrganization, listChildren, listClassrooms } from "@/lib/data";

export default async function KioskChildrenPage() {
  const org = await getActiveOrganization();
  const [roster, classrooms] = await Promise.all([listChildren(org.id), listClassrooms(org.id)]);
  return <KioskRoster roster={roster.filter((c) => c.enrollmentStatus === "ACTIVE")} classrooms={classrooms} />;
}
