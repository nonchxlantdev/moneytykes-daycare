import { CheckOutFlow } from "@/components/kiosk/check-out-flow";
import { getActiveOrganization, listChildren, listClassrooms } from "@/lib/data";

export default async function KioskCheckOutPage({ searchParams }: PageProps<"/kiosk/check-out">) {
  const { child } = await searchParams;
  const org = await getActiveOrganization();
  const [roster, classrooms] = await Promise.all([listChildren(org.id), listClassrooms(org.id)]);
  return (
    <CheckOutFlow
      roster={roster.filter((c) => c.enrollmentStatus === "ACTIVE")}
      classrooms={classrooms}
      initialChildId={typeof child === "string" ? child : undefined}
    />
  );
}
