import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/** Form-level error (server or network). Field errors are shown next to their inputs. */
export function FormAlert({ message, className }: { message?: string; className?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className={cn("flex items-start gap-2 rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger", className)}>
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}
