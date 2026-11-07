/** Formats a possibly-missing number for display; "—" when unavailable. */
export function nf(value: number | null | undefined, digits = 2): string {
  return value === null || value === undefined || !Number.isFinite(value)
    ? "—"
    : value.toFixed(digits);
}
