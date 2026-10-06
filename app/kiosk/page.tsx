import Link from "next/link";
import { Clock, LogIn, LogOut, UsersRound } from "lucide-react";
import { KioskActionButton } from "@/components/kiosk/kiosk-action-button";
import { KioskScenery } from "@/components/kiosk/kiosk-scenery";
import { KioskWelcome } from "@/components/kiosk/kiosk-welcome";

export default function KioskHomePage() {
  return (
    <>
      <div className="fixed inset-0 z-0">
        <KioskScenery />
      </div>
      <div className="relative flex flex-1 flex-col items-center justify-center pb-32 sm:pb-40">
        <KioskWelcome />
        <nav aria-label="Kiosk actions" className="mt-8 grid w-full max-w-4xl grid-cols-1 gap-5 sm:mt-10 sm:grid-cols-2 sm:gap-6">
          <KioskActionButton href="/kiosk/check-in" title="Child Check In" subtitle="Drop-off" icon={LogIn} tone="success" />
          <KioskActionButton href="/kiosk/check-out" title="Child Check Out" subtitle="Pickup" icon={LogOut} tone="primary" />
          <KioskActionButton href="/kiosk/staff" title="Staff Time Clock" subtitle="Clock in or out" icon={Clock} tone="secondary" />
          <KioskActionButton href="/kiosk/children" title="View Children" subtitle="Who's here today" icon={UsersRound} tone="accent" />
        </nav>
        <Link href="/dashboard" className="mt-8 rounded-lg px-3 py-2 text-sm font-semibold text-ink-subtle hover:text-ink">
          Staff: exit kiosk mode
        </Link>
      </div>
    </>
  );
}
