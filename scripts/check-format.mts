// Formatting guard: the badge's number is the whole point of the card, so the
// rounding rules are pinned here rather than trusted to review.
//
//   npm run test:format
import { formatCount } from '../src/lib/format.ts';

const CASES: [number, string][] = [
  [0, '0'],
  [7, '7'],
  [999, '999'],
  [1_000, '1,000'],
  [1_120, '1,120'],
  [9_999, '9,999'],
  [10_000, '10k'],
  [12_345, '12k'],
  [999_499, '999k'],
  [999_500, '1M'],
  [1_000_000, '1M'],
  [2_100_000, '2.1M'],
];

let failures = 0;
for (const [value, expected] of CASES) {
  const actual = formatCount(value);
  if (actual !== expected) {
    failures += 1;
    console.error(`FAIL ${value} -> ${actual} (expected ${expected})`);
  }
}

if (failures > 0) {
  throw new Error(`${failures} number format(s) did not match`);
}

console.log(`ok - ${CASES.length} number formats pinned (1120 -> ${formatCount(1_120)})`);
