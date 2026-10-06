import type { Metadata } from "next";
import { ChildrenDirectory } from "@/components/children/children-directory";
import { getChildRecords, getClassroomList } from "@/lib/data";

export const metadata: Metadata = { title: "Children" };

export default async function ChildrenPage({ searchParams }: PageProps<"/children">) {
  const { q } = await searchParams;
  const [roster, classrooms] = await Promise.all([getChildRecords(), getClassroomList()]);
  return <ChildrenDirectory roster={roster} classrooms={classrooms} initialQuery={typeof q === "string" ? q : ""} />;
}
