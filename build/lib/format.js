/**
 * Compact, badge-friendly number formatting.
 *
 * Rules (see the LOChy spec):
 *   - below 1,000: exact digits
 *   - 1,000 and above: whole thousands, e.g. 5000 -> "5k", 12000 -> "12k"
 *   - 1,000,000 and above: one decimal, e.g. 2100000 -> "2.1M"
 */
export function formatCount(n) {
    if (n >= 1_000_000) {
        const millions = Math.round(n / 100_000) / 10;
        const text = Number.isInteger(millions) ? millions.toFixed(0) : millions.toFixed(1);
        return `${text}M`;
    }
    if (n >= 1_000) {
        return `${Math.round(n / 1_000)}k`;
    }
    return String(n);
}
//# sourceMappingURL=format.js.map