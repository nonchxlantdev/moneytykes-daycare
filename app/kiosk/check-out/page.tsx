import { CheckOutFlow } from "@/components/kiosk/check-out-flow";
import { getChildRecords, getClassroomList } from "@/lib/data";

/** All children (not just ACTIVE) so a child withdrawn mid-day can still be signed out. */
export default async function KioskCheckOutPage({ searchParams }: PageProps<"/kiosk/check-out">) {
  const { child } = await searchParams;
  const [roster, classrooms] = await Promise.all([getChildRecords(), getClassroomList()]);
  return <CheckOutFlow roster={roster} classrooms={classrooms} initialChildId={typeof child === "string" ? child : undefined} />;
}
