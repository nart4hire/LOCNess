// Colour-map guard: every language colour must clear MIN_BAR_CONTRAST against
// the bar track, otherwise its bar renders as an empty slot on the dark card.
//
//   npm run test:colors
import { readFileSync } from 'node:fs';
import { BAR_TRACK_COLOR, colorFor, contrastRatio } from '../src/lib/colors.ts';

const MIN = 3;
const src = readFileSync(new URL('../src/lib/colors.ts', import.meta.url), 'utf8');
const keys = [...src.matchAll(/^  '?(?<key>[a-z0-9+# .-]+)'?:\s*'#/gm)].map((m) => m.groups?.key ?? '');
const languages = [...keys, 'unmapped-language'];

let failures = 0;
const rows = languages.map((language) => {
  const hex = colorFor(language);
  const ratio = contrastRatio(hex, BAR_TRACK_COLOR);
  if (ratio < MIN) {
    failures += 1;
    console.error(`FAIL ${language} ${hex} contrast ${ratio.toFixed(2)} < ${MIN}`);
  }
  return { language, hex, ratio };
});

rows.sort((a, b) => a.ratio - b.ratio);
console.log(`${rows.length} colours checked against ${BAR_TRACK_COLOR}`);
for (const row of rows.slice(0, 5)) {
  console.log(`  lowest: ${row.language.padEnd(14)} ${row.hex} ${row.ratio.toFixed(2)}`);
}

if (failures > 0) {
  console.error(`\n${failures} colour(s) below ${MIN}:1`);
  process.exit(1);
}

console.log(`ok - every colour clears ${MIN}:1 (min ${rows[0]?.ratio.toFixed(2)})`);
