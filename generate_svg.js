// cloc-to-svg.js
import fs from 'fs';
import path from 'path';
import opentype from 'opentype.js';

// Helper: Convert text into an SVG <path>
async function textToPath(fontPath, text, fontSize, x, y, fill = '#333') {
  const font = await opentype.load(fontPath);
  const pathData = font.getPath(text, x, y, fontSize).toPathData();
  return `<path d="${pathData}" fill="${fill}" />`;
}

async function main() {
  // 1. Read CLOC result
  const resultPath = './result.json';
  const clocData = JSON.parse(fs.readFileSync(resultPath, 'utf8'));

  // 2. Get the font path
  const fontPath = path.resolve('./assets/fonts/Monocraft.otf');

  // 3. Prepare your SVG content
  const title = await textToPath(fontPath, 'CLOC Summary', 28, 20, 40, '#222');
  const entries = [];

  let yOffset = 80;
  for (const [lang, stats] of Object.entries(clocData)) {
    if (!stats.code) continue; // skip non-code entries
    const text = `${lang}: ${stats.code} lines`;
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

  // Ensure dist exists
  const distDir = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // 5. Save it
  fs.writeFileSync('./dist/badge.svg', svg, 'utf8');
  console.log('Flattened SVG badge created: badge.svg');
}

main().catch(console.error);
