export type UnitGroup = "mass" | "volume" | "count";

export type Unit = { value: string; label: string; group: UnitGroup };

/** Suggestions only. `unit` stays free text on the wire. */
export const units: Unit[] = [
  { value: "g", label: "g", group: "mass" },
  { value: "kg", label: "kg", group: "mass" },
  { value: "ml", label: "ml", group: "volume" },
  { value: "l", label: "l", group: "volume" },
  { value: "tsp", label: "tsp", group: "volume" },
  { value: "tbsp", label: "tbsp", group: "volume" },
  { value: "cup", label: "cup", group: "volume" },
  { value: "pcs", label: "pcs", group: "count" },
  { value: "clove", label: "clove", group: "count" },
  { value: "pinch", label: "pinch", group: "count" },
];

export const unitGroupLabel: Record<UnitGroup, string> = {
  mass: "Weight",
  volume: "Volume",
  count: "Count",
};

export function formatQty(qty: number): string {
  if (Number.isInteger(qty)) return String(qty);
  return String(Math.round(qty * 100) / 100);
}

/** Ingredients scale with cooks. Times and tools do not. */
export function scaleQty(qty: number, fromCooks: number, toCooks: number): number {
  if (fromCooks <= 0) return qty;
  return (qty * toCooks) / fromCooks;
}

/** `scaleQty` that passes a missing amount through. */
export function scaleAmount(
  qty: number | null | undefined,
  fromCooks: number,
  toCooks: number
): number | null | undefined {
  return qty == null ? qty : scaleQty(qty, fromCooks, toCooks);
}

export function formatAmount(
  qty: number | null | undefined,
  unit: string | null | undefined
): string {
  const parts: string[] = [];
  if (qty != null) parts.push(formatQty(qty));
  if (unit) parts.push(unit);
  return parts.join(" ");
}

export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** A min–max range of durations, or one duration when both ends read the same. */
export function formatSpan(minSeconds: number, maxSeconds: number): string {
  const min = formatDuration(minSeconds);
  const max = formatDuration(maxSeconds);
  return min === max ? min : `${min}–${max}`;
}

export const durationPresets = [1, 2, 5, 10, 15, 20, 30, 45, 60, 90, 120].map(
  (minutes) => minutes * 60
);
