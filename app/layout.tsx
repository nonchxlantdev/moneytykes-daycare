import type { Metadata, Viewport } from "next";
import "./globals.css";

/**
 * Root layout is tenant-neutral (it also renders /login). Tenant branding,
 * data and permissions are loaded by <TenantShell> in the protected layouts.
 */
export const metadata: Metadata = {
  title: { default: "Daycare", template: "%s" },
  description: "Daycare management",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f7fc",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
