import * as fs from 'node:fs';
import { load, type Font } from 'opentype.js';
import { colorFor } from './colors.js';
import { formatCount } from './format.js';

export type RenderBadgeOptions = {
  clocJson: object;
  title?: string;
  fontPath?: string;
  mascotPath?: string;
};

const DEFAULT_FONT_PATH = 'assets/fonts/Monocraft.otf';
const DEFAULT_MASCOT_PATH = 'assets/LOChy_Draft.png';
const DEFAULT_TITLE = 'LOC Summary';

const PADDING = 24;
const MASCOT_WIDTH = 140;
const COLUMN_GAP = 24;
const MAX_LANGUAGES = 8;
const BAR_MAX_WIDTH = 150;
const BAR_HEIGHT = 8;
const ROW_HEIGHT = 26;

const TITLE_SIZE = 26;
const TOTAL_SIZE = 44;
const LABEL_SIZE = 15;
const ROW_SIZE = 15;
const COUNT_SIZE = 14;

const CARD_GRADIENT_TOP = '#0d1117';
const CARD_GRADIENT_BOTTOM = '#161b22';
const CARD_STROKE = '#30363d';
const TEXT_FILL = '#e6edf3';
const INK = TEXT_FILL;
const MUTED = TEXT_FILL;
const BAR_TRACK = '#21262d';

type LanguageRow = {
  language: string;
  code: number;
};

type MascotSize = {
  width: number;
  height: number;
};

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function parseLanguageRows(clocJson: object): LanguageRow[] {
  const record = asRecord(clocJson);
  if (record === undefined) {
    return [];
  }

  const rows: LanguageRow[] = [];
  for (const [language, value] of Object.entries(record)) {
    if (language === 'header' || language === 'SUM') {
      continue;
    }

    const stats = asRecord(value);
    if (stats === undefined) {
      continue;
    }

    const code = stats['code'];
    if (typeof code !== 'number' || !Number.isFinite(code) || code <= 0) {
      continue;
    }

    rows.push({ language, code });
  }

  rows.sort((left, right) => right.code - left.code || left.language.localeCompare(right.language));
  return rows;
}

function parseTotal(clocJson: object, rows: LanguageRow[]): number {
  const record = asRecord(clocJson);
  const sum = record === undefined ? undefined : asRecord(record['SUM']);
  const code = sum === undefined ? undefined : sum['code'];

  if (typeof code === 'number' && Number.isFinite(code) && code >= 0) {
    return code;
  }

  return rows.reduce((total, row) => total + row.code, 0);
}

function topRows(rows: LanguageRow[]): LanguageRow[] {
  const top = rows.slice(0, MAX_LANGUAGES);
  const rest = rows.slice(MAX_LANGUAGES);

  if (rest.length === 0) {
    return top;
  }

  const othersCode = rest.reduce((total, row) => total + row.code, 0);
  return [...top, { language: 'Others', code: othersCode }];
}

function readPngSize(png: Buffer): MascotSize {
  if (png.length >= 24 && png.toString('ascii', 12, 16) === 'IHDR') {
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    if (width > 0 && height > 0) {
      return { width, height };
    }
  }

  return { width: 1, height: 1 };
}

async function loadFont(fontPath: string): Promise<Font> {
  try {
    return await load(fontPath);
  } catch (error) {
    throw new Error(`Failed to load font "${fontPath}": ${describeError(error)}`);
  }
}

async function loadMascot(mascotPath: string): Promise<Buffer> {
  try {
    return await fs.promises.readFile(mascotPath);
  } catch (error) {
    throw new Error(`Failed to read mascot image "${mascotPath}": ${describeError(error)}`);
  }
}

function textWidth(font: Font, text: string, size: number): number {
  return font.getAdvanceWidth(text, size);
}

function textPath(font: Font, text: string, x: number, y: number, size: number, fill: string): string {
  const data = font.getPath(text, x, y, size).toPathData(2);
  return `<path d="${data}" fill="${fill}"/>`;
}

/**
 * Render a complete, self-contained LOChy badge card.
 *
 * The card is sized from the measured text (using the loaded font once) and
 * from the mascot's aspect ratio, so longer titles and extra language rows grow
 * the SVG instead of clipping.
 */
export async function renderBadge(opts: RenderBadgeOptions): Promise<string> {
  const title = opts.title ?? DEFAULT_TITLE;
  const fontPath = opts.fontPath ?? DEFAULT_FONT_PATH;
  const mascotPath = opts.mascotPath ?? DEFAULT_MASCOT_PATH;

  const font = await loadFont(fontPath);
  const mascotPng = await loadMascot(mascotPath);

  const allRows = parseLanguageRows(opts.clocJson);
  const total = parseTotal(opts.clocJson, allRows);
  const rows = topRows(allRows);

  const mascot = readPngSize(mascotPng);
  const mascotHeight = Math.round((MASCOT_WIDTH * mascot.height) / mascot.width);

  const titleWidth = textWidth(font, title, TITLE_SIZE);
  const totalText = formatCount(total);
  const totalWidth = textWidth(font, totalText, TOTAL_SIZE);
  const labelWidth = textWidth(font, 'LOC', LABEL_SIZE);
  const totalBlockWidth = totalWidth + 8 + labelWidth;

  const nameWidths = rows.map((row) => textWidth(font, row.language, ROW_SIZE));
  const countWidths = rows.map((row) => textWidth(font, formatCount(row.code), COUNT_SIZE));
  const nameColumnWidth = nameWidths.length === 0 ? 0 : Math.max(...nameWidths);
  const countColumnWidth = countWidths.length === 0 ? 0 : Math.max(...countWidths);
  const maxCode = rows.reduce((max, row) => Math.max(max, row.code), 0);

  const rowWidth =
    rows.length === 0 ? 0 : nameColumnWidth + 12 + BAR_MAX_WIDTH + 10 + countColumnWidth;
  const contentWidth = Math.max(titleWidth, totalBlockWidth, rowWidth);
  const width = Math.ceil(PADDING + MASCOT_WIDTH + COLUMN_GAP + contentWidth + PADDING);

  const titleBaseline = PADDING + TITLE_SIZE;
  const totalBaseline = titleBaseline + 10 + TOTAL_SIZE;
  const firstRowBaseline = totalBaseline + 24;
  const contentBottom =
    rows.length === 0
      ? totalBaseline + 12
      : firstRowBaseline + (rows.length - 1) * ROW_HEIGHT + 12;
  const height = Math.ceil(Math.max(PADDING + mascotHeight, contentBottom) + PADDING);

  const rightX = PADDING + MASCOT_WIDTH + COLUMN_GAP;
  const mascotX = -(PADDING + MASCOT_WIDTH);
  const mascotY = Math.round((height - mascotHeight) / 2);
  const nameX = rightX;
  const barX = rightX + nameColumnWidth + 12;
  const countX = barX + BAR_MAX_WIDTH + 10;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  );
  parts.push('<defs>');
  parts.push('<linearGradient id="card-gradient" x1="0" y1="0" x2="0" y2="1">');
  parts.push(`<stop offset="0" stop-color="${CARD_GRADIENT_TOP}"/>`);
  parts.push(`<stop offset="1" stop-color="${CARD_GRADIENT_BOTTOM}"/>`);
  parts.push('</linearGradient>');
  parts.push('</defs>');
  parts.push(
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="14" fill="url(#card-gradient)" stroke="${CARD_STROKE}" stroke-width="1"/>`,
  );
  parts.push(
    `<image href="data:image/png;base64,${mascotPng.toString('base64')}" x="${mascotX}" y="${mascotY}" width="${MASCOT_WIDTH}" height="${mascotHeight}" preserveAspectRatio="xMidYMid meet" transform="scale(-1,1)"/>`,
  );
  parts.push(textPath(font, title, rightX, titleBaseline, TITLE_SIZE, INK));
  parts.push(textPath(font, totalText, rightX, totalBaseline, TOTAL_SIZE, INK));
  parts.push(textPath(font, 'LOC', rightX + totalWidth + 8, totalBaseline, LABEL_SIZE, MUTED));

  rows.forEach((row, index) => {
    const baseline = firstRowBaseline + index * ROW_HEIGHT;
    const barWidth =
      maxCode === 0 ? 0 : Math.max(2, Math.round((BAR_MAX_WIDTH * row.code) / maxCode));
    const barY = baseline - 11;

    parts.push(textPath(font, row.language, nameX, baseline, ROW_SIZE, INK));
    parts.push(
      `<rect x="${barX}" y="${barY}" width="${BAR_MAX_WIDTH}" height="${BAR_HEIGHT}" rx="4" fill="${BAR_TRACK}"/>`,
    );
    parts.push(
      `<rect x="${barX}" y="${barY}" width="${barWidth}" height="${BAR_HEIGHT}" rx="4" fill="${colorFor(row.language)}"/>`,
    );
    parts.push(textPath(font, formatCount(row.code), countX, baseline, COUNT_SIZE, MUTED));
  });

  parts.push('</svg>');
  return `${parts.join('\n')}\n`;
}
