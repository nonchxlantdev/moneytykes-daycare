import { CheckInFlow } from "@/components/kiosk/check-in-flow";
import { getActiveChildRecords, getClassroomList } from "@/lib/data";

export default async function KioskCheckInPage({ searchParams }: PageProps<"/kiosk/check-in">) {
  const { child } = await searchParams;
  const [roster, classrooms] = await Promise.all([getActiveChildRecords(), getClassroomList()]);
  return <CheckInFlow roster={roster} classrooms={classrooms} initialChildId={typeof child === "string" ? child : undefined} />;
}
