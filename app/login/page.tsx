import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/auth/login-screen";
import { getOptionalUser } from "@/lib/auth/credentials";

export const metadata: Metadata = {
  title: { absolute: "Enter · Vision Forge" },
  description: "Enter the password to open the daycare dashboard.",
};

export default async function LoginPage() {
  const user = await getOptionalUser();
  if (user) redirect("/dashboard");
  return <LoginScreen />;
}
