/**
 * Compact, badge-friendly number formatting.
 *
 * Rules (see the LOChy spec):
 *   - below 1,000: exact digits
 *   - 1,000 and above: whole thousands, e.g. 5000 -> "5k", 12000 -> "12k"
 *   - 1,000,000 and above: one decimal, e.g. 2100000 -> "2.1M"
 */
export declare function formatCount(n: number): string;
//# sourceMappingURL=format.d.ts.map