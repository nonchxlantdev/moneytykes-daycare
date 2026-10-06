/**
 * Friendly, brand-tinted decorative scenery for the kiosk home screen:
 * a sun, soft clouds, a rainbow and rolling hills. Pure SVG, no
 * characters, aria-hidden. Colors come from brand tokens.
 */
export function KioskScenery() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Sun */}
      <svg className="absolute top-28 right-[6%] size-28 animate-[spin_60s_linear_infinite] sm:size-36" viewBox="0 0 100 100">
        {Array.from({ length: 12 }).map((_, i) => (
          <rect
            key={i}
            x="48"
            y="4"
            width="4"
            height="14"
            rx="2"
            fill="#ffc43d"
            transform={`rotate(${i * 30} 50 50)`}
          />
        ))}
        <circle cx="50" cy="50" r="26" fill="#ffd23f" />
        <circle cx="42" cy="46" r="2.6" fill="#7a4d00" />
        <circle cx="58" cy="46" r="2.6" fill="#7a4d00" />
        <path d="M41 55 q9 8 18 0" stroke="#7a4d00" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="36" cy="54" r="3.5" fill="#ff9b6a" opacity=".6" />
        <circle cx="64" cy="54" r="3.5" fill="#ff9b6a" opacity=".6" />
      </svg>

      {/* Clouds */}
      <svg className="absolute top-36 left-[4%] w-40 opacity-90 sm:w-52" viewBox="0 0 200 80">
        <path d="M30 70 a26 26 0 0 1 8-50 a34 34 0 0 1 64-6 a26 26 0 0 1 46 16 a22 22 0 0 1 22 40 Z" fill="white" />
      </svg>
      <svg className="absolute top-[52%] right-[2%] w-32 opacity-80" viewBox="0 0 200 80">
        <path d="M30 70 a26 26 0 0 1 8-50 a34 34 0 0 1 64-6 a26 26 0 0 1 46 16 a22 22 0 0 1 22 40 Z" fill="white" />
      </svg>

      {/* Rainbow + hills */}
      <svg className="absolute -bottom-2 left-0 h-40 w-full sm:h-48" viewBox="0 0 1200 200" preserveAspectRatio="none">
        <g transform="translate(600 210)" fill="none" strokeWidth="18" opacity=".85">
          <path d="M-170 0 a170 170 0 0 1 340 0" stroke="#ff8a8a" />
          <path d="M-150 0 a150 150 0 0 1 300 0" stroke="#ffc46b" />
          <path d="M-130 0 a130 130 0 0 1 260 0" stroke="#ffe27a" />
          <path d="M-110 0 a110 110 0 0 1 220 0" stroke="#8fe0a8" />
          <path d="M-90 0 a90 90 0 0 1 180 0" stroke="#8ec5ff" />
        </g>
        <path d="M0 150 C 200 90, 380 110, 560 150 S 900 110, 1200 140 L1200 200 L0 200 Z" fill="color-mix(in oklab, var(--brand-success) 35%, white)" />
        <path d="M0 175 C 260 130, 520 160, 700 175 S 1000 150, 1200 170 L1200 200 L0 200 Z" fill="color-mix(in oklab, var(--brand-success) 55%, white)" />
      </svg>
    </div>
  );
}
