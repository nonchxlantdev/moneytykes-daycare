import Image from "next/image";
import { cn, hashToIndex, initials } from "@/lib/utils";

/** Decorative pastel pairs for photo-less avatars (not tenant brand colors). */
const AVATAR_PALETTE = [
  ["#ffe7d1", "#b4570e"],
  ["#dceaff", "#1d4fb8"],
  ["#e3f7e8", "#17773f"],
  ["#efe5ff", "#5b2fc4"],
  ["#ffe1ea", "#b0284f"],
  ["#fff3c4", "#8a6200"],
  ["#d9f5f6", "#126b70"],
  ["#f1ece4", "#6b5232"],
] as const;

interface PersonAvatarProps {
  name: string;
  photoUrl?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  ring?: boolean;
}

const sizes = {
  xs: "size-7 text-[10px] rounded-lg",
  sm: "size-9 text-xs rounded-xl",
  md: "size-11 text-sm rounded-xl",
  lg: "size-14 text-base rounded-2xl",
  xl: "size-20 text-2xl rounded-3xl",
  "2xl": "size-28 text-4xl rounded-[2rem]",
} as const;

const pixelSize = { xs: 28, sm: 36, md: 44, lg: 56, xl: 80, "2xl": 112 } as const;

/**
 * Reusable avatar for children and staff. Renders the stored photo
 * when available (later: short-lived signed R2 URL), otherwise a
 * friendly deterministic monogram.
 */
export function ChildAvatar({ name, photoUrl, size = "md", className, ring = false }: PersonAvatarProps) {
  const [bg, fg] = AVATAR_PALETTE[hashToIndex(name, AVATAR_PALETTE.length)];
  const base = cn(
    "relative inline-flex shrink-0 items-center justify-center overflow-hidden font-extrabold select-none",
    sizes[size],
    ring && "ring-4 ring-surface",
    className,
  );

  if (photoUrl) {
    return (
      <span className={base}>
        <Image src={photoUrl} alt={name} width={pixelSize[size]} height={pixelSize[size]} className="size-full object-cover" unoptimized />
      </span>
    );
  }

  return (
    <span className={base} style={{ backgroundColor: bg, color: fg }} aria-hidden="true">
      {initials(name)}
      <span
        className="pointer-events-none absolute -right-1/4 -bottom-1/4 size-3/4 rounded-full opacity-40"
        style={{ backgroundColor: "#ffffff" }}
      />
    </span>
  );
}

export { ChildAvatar as PersonAvatar };
