export function fullName(p: { firstName: string; lastName: string }): string {
  return `${p.firstName} ${p.lastName}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Age label from a YYYY-MM-DD birth date: "8 mo" under 2 years, otherwise "3 yrs". */
export function ageLabel(dateOfBirth: string, now: Date = new Date()): string {
  const [y, m, d] = dateOfBirth.split("-").map(Number);
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  if (now.getDate() < d) months -= 1;
  if (months < 24) return `${Math.max(0, months)} mo`;
  const years = Math.floor(months / 12);
  return `${years} yrs`;
}

/** Stable hash → index, used for deterministic avatar palettes. */
export function hashToIndex(value: string, modulo: number): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h) % modulo;
}
