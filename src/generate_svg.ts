// cloc-to-svg.js
import fs from 'fs';
import path from 'path';
import opentype from 'opentype.js';

type LanguageStats = {
  language: string;
  nFiles: number;
  blank: number;
  comment: number;
  code: number;
};

const [, , firstArg, secondArg, thirdArg, forthArg] = process.argv;

const fontPath = firstArg     || './assets/fonts/Monocraft.otf';
const logoPath = secondArg    || './assets/logo.svg';
const clocDataPath = thirdArg || './dist/result.json';
const outputPath = forthArg   || './dist/badge.svg';

// Helper: Convert text into an SVG <path>
async function textToPath(fontPath: string, text: string, fontSize: number, x: number, y: number, fill = '#333') {
  const font = await opentype.load(fontPath);
  const pathData = font.getPath(text, x, y, fontSize).toPathData(3);
  return `<path d="${pathData}" fill="${fill}" />`;
}

// async function generateBadge(clocData) {

// }


async function main() {
  // 1. Read CLOC result
  const resultPath = clocDataPath;
  const clocDataRaw = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
  const languages: LanguageStats[] = Object.entries(clocDataRaw)
    .filter(([key]) => key !== "header" && key !== "SUM")
    .map(([language, stats]) => ({
      language,
      ...(stats as Omit<LanguageStats, "language">),
    }));

  // 2. Get the font path
  const fontPath = path.resolve('./assets/fonts/Monocraft.otf');

  // 3. Prepare your SVG content
  const title = await textToPath(fontPath, 'CLOC Summary', 28, 20, 40, '#222');
  const entries = [];

  let yOffset = 80;
  for (const { language, code } of languages) {
    if (!code) continue; // skip if no code lines
    const text = `${language}: ${code} lines`;
    entries.push(await textToPath(fontPath, text, 18, 20, yOffset));
    yOffset += 30;
  }

  // 4. Build the SVG
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="500" height="${yOffset + 20}">
  <rect width="100%" height="100%" fill="#fff" />
  ${title}
  ${entries.join('\n')}
</svg>
  `;

  // 5. Ensure dist exists
  const distDir = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // 6. Save it
  fs.writeFileSync('./dist/badge.svg', svg, 'utf8');
}

main().catch(console.error);
