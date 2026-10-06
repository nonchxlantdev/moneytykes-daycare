import { redirect } from "next/navigation";
import { getOptionalIdentity } from "@/lib/auth/credentials";

/** Platform entry. The daycare app itself is only reachable with a session. */
export default async function Home() {
  const user = await getOptionalIdentity();
  redirect(user ? "/dashboard" : "/login");
}
