import { CheckInFlow } from "@/components/kiosk/check-in-flow";
import { getActiveOrganization, listChildren, listClassrooms } from "@/lib/data";

export default async function KioskCheckInPage({ searchParams }: PageProps<"/kiosk/check-in">) {
  const { child } = await searchParams;
  const org = await getActiveOrganization();
  const [roster, classrooms] = await Promise.all([listChildren(org.id), listClassrooms(org.id)]);
  return (
    <CheckInFlow
      roster={roster.filter((c) => c.enrollmentStatus === "ACTIVE")}
      classrooms={classrooms}
      initialChildId={typeof child === "string" ? child : undefined}
    />
  );
}
