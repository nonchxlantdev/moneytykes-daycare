import type { Metadata } from "next";
import { ChildrenDirectory } from "@/components/children/children-directory";
import { getActiveOrganization, listChildren, listClassrooms } from "@/lib/data";

export const metadata: Metadata = { title: "Children" };

export default async function ChildrenPage({ searchParams }: PageProps<"/children">) {
  const { q } = await searchParams;
  const org = await getActiveOrganization();
  const [roster, classrooms] = await Promise.all([listChildren(org.id), listClassrooms(org.id)]);

  return <ChildrenDirectory roster={roster} classrooms={classrooms} initialQuery={typeof q === "string" ? q : ""} />;
}
