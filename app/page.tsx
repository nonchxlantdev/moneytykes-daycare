import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/auth/credentials";

/** Platform entry. The daycare app itself is only reachable with a session. */
export default async function Home() {
  const user = await getOptionalUser();
  redirect(user ? "/dashboard" : "/login");
}
