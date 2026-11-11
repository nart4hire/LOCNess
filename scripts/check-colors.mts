// Colour-map guard: every language colour must clear MIN_BAR_CONTRAST against
// the bar track, otherwise its bar renders as an empty slot on the dark card.
//
//   npm run test:colors
import { readFileSync } from 'node:fs';
import {
  BAR_TRACK_COLOR,
  barColorFor,
  colorFor,
  contrastRatio,
} from '../src/lib/colors.ts';

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
  throw new Error(`${failures} colour(s) below ${MIN}:1`);
}

console.log(`ok - every colour clears ${MIN}:1 (min ${rows[0]?.ratio.toFixed(2)})`);

// Bars are dimmed toward the track in proportion to their share, so two more
// invariants matter: a full-share bar keeps the plain colour, and even a
// vanishing share stays visible as a mark.
const DIM_FLOOR = 2;
const fullStrength = languages.filter((language) => barColorFor(language, 1) !== colorFor(language));
if (fullStrength.length > 0) {
  throw new Error(`bars at full share should not be dimmed: ${fullStrength.join(', ')}`);
}

const dimmest = languages
  .map((language) => ({
    language,
    hex: barColorFor(language, 0),
    ratio: contrastRatio(barColorFor(language, 0), BAR_TRACK_COLOR),
  }))
  .sort((a, b) => a.ratio - b.ratio)[0];

if (dimmest === undefined || dimmest.ratio < DIM_FLOOR) {
  throw new Error(
    `dimmest bar ${dimmest?.hex} contrast ${dimmest?.ratio.toFixed(2)} < ${DIM_FLOOR}:1`,
  );
}

console.log(
  `ok - full-share bars undimmed; dimmest bar clears ${DIM_FLOOR}:1 ` +
    `(${dimmest.language} ${dimmest.hex} ${dimmest.ratio.toFixed(2)})`,
);
