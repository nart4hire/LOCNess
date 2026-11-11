/**
 * Compact, badge-friendly number formatting.
 *
 * Rules (see the LOChy spec):
 *   - below 10,000: exact digits with thousands separators, e.g. 1120 -> "1,120"
 *   - 10,000 and above: whole thousands, e.g. 12000 -> "12k", 940000 -> "940k"
 *   - 1,000,000 and above: one decimal, e.g. 2100000 -> "2.1M"
 *
 * Rounding to whole thousands below 10,000 would flatten most repositories into
 * "1k" or "2k", which is exactly the range a badge is read in.
 */
export function formatCount(n: number): string {
  // 999,500 is the point where whole thousands would round up to "1000k";
  // hand those to the millions branch so the badge never shows four digits
  // before the suffix.
  if (n >= 999_500) {
    const millions = Math.round(n / 100_000) / 10;
    const text = Number.isInteger(millions) ? millions.toFixed(0) : millions.toFixed(1);
    return `${text}M`;
  }

  if (n >= 10_000) {
    return `${Math.round(n / 1_000)}k`;
  }

  // Group by hand rather than via toLocaleString: the Workers runtime ships a
  // reduced ICU, and a badge must not depend on it.
  return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}