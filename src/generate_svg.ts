import * as fs from 'node:fs';
import * as path from 'node:path';
import { renderBadge } from './lib/render.js';

const DEFAULT_FONT_PATH = 'assets/fonts/Monocraft.otf';
const DEFAULT_MASCOT_PATH = 'assets/LOChy_Draft.png';
const DEFAULT_TITLE = 'LOC Summary';
const USAGE =
  'Usage: generate_svg <cloc.json> <out.svg> [--font <path>] [--mascot <path>] ' +
  '[--title <name>] [--no-outline]';

type CliOptions = {
  clocPath: string;
  outputPath: string;
  fontPath: string;
  mascotPath: string;
  outlineText: boolean;
  title: string;
};

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parseArgs(argv: string[]): CliOptions {
  const positionals: string[] = [];
  let fontPath = DEFAULT_FONT_PATH;
  let mascotPath = DEFAULT_MASCOT_PATH;
  let outlineText = true;
  let title = DEFAULT_TITLE;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === undefined) {
      continue;
    }

    if (arg === '--font' || arg === '--mascot' || arg === '--title') {
      const value = argv[index + 1];
      if (value === undefined) {
        throw new Error(`${arg} requires a value\n${USAGE}`);
      }
      if (arg === '--font') {
        fontPath = value;
      } else if (arg === '--mascot') {
        mascotPath = value;
      } else {
        title = value;
      }
      index += 1;
    } else if (arg === '--no-outline') {
      outlineText = false;
    } else if (arg.startsWith('--font=')) {
      fontPath = arg.slice('--font='.length);
      if (fontPath.length === 0) {
        throw new Error(`--font requires a value\n${USAGE}`);
      }
    } else if (arg.startsWith('--mascot=')) {
      mascotPath = arg.slice('--mascot='.length);
      if (mascotPath.length === 0) {
        throw new Error(`--mascot requires a value\n${USAGE}`);
      }
    } else if (arg.startsWith('--title=')) {
      title = arg.slice('--title='.length);
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option "${arg}"\n${USAGE}`);
    } else {
      positionals.push(arg);
    }
  }

  const [clocPath, outputPath, ...extra] = positionals;
  if (clocPath === undefined || outputPath === undefined || extra.length > 0) {
    throw new Error(`Expected exactly two positional arguments\n${USAGE}`);
  }

  return { clocPath, outputPath, fontPath, mascotPath, outlineText, title };
}

async function readClocJson(clocPath: string): Promise<object> {
  try {
    const raw = await fs.promises.readFile(clocPath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('expected a JSON object');
    }
    return parsed;
  } catch (error) {
    throw new Error(`Failed to read cloc JSON "${clocPath}": ${describeError(error)}`);
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const clocJson = await readClocJson(options.clocPath);

  const svg = await renderBadge({
    clocJson,
    fontPath: options.fontPath,
    mascotPath: options.mascotPath,
    outlineText: options.outlineText,
    title: options.title,
  });

  try {
    const outputDir = path.dirname(path.resolve(options.outputPath));
    await fs.promises.mkdir(outputDir, { recursive: true });
    await fs.promises.writeFile(options.outputPath, svg, 'utf8');
  } catch (error) {
    throw new Error(`Failed to write SVG "${options.outputPath}": ${describeError(error)}`);
  }
}

main().catch((error: unknown) => {
  console.error(describeError(error));
  process.exitCode = 1;
});
