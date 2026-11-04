import { spawn, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as core from '@actions/core';
import { renderBadge } from '../lib/render.js';

const ACTION_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_FONT_PATH = path.join(ACTION_ROOT, 'assets', 'fonts', 'Monocraft.otf');
const DEFAULT_MASCOT_PATH = path.join(ACTION_ROOT, 'assets', 'LOChy_Draft.png');
const CLOC_INSTALL_COMMAND = 'sudo apt-get update && sudo apt-get install -y cloc jq';

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function clocIsAvailable(): boolean {
  const result = spawnSync('sh', ['-c', 'command -v cloc'], {
    stdio: 'ignore',
  });
  return result.status === 0;
}

function installCloc(): void {
  console.log(`cloc not found on PATH; installing with: ${CLOC_INSTALL_COMMAND}`);
  const result = spawnSync('sh', ['-c', CLOC_INSTALL_COMMAND], {
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  if (result.error !== undefined) {
    throw new Error(`cloc install failed: ${result.error.message}`);
  }
}

async function ensureCloc(): Promise<void> {
  if (clocIsAvailable()) {
    return;
  }

  installCloc();

  if (!clocIsAvailable()) {
    throw new Error(
      `cloc is not installed and could not be installed with "${CLOC_INSTALL_COMMAND}". ` +
        'Install cloc on the runner (or make it available on PATH) and re-run the action.',
    );
  }
}

function runCloc(analyzePath: string, tempDir: string): Promise<string> {
  const jsonPath = path.join(tempDir, 'cloc.json');

  return new Promise((resolve, reject) => {
    const child = spawn('cloc', [analyzePath, '--json', '--quiet', `--out=${jsonPath}`], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });

    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });

    child.on('error', (error: Error) => {
      reject(new Error(`Failed to run cloc: ${error.message}`));
    });

    child.on('close', (code: number | null) => {
      if (code === 0) {
        resolve(jsonPath);
        return;
      }

      const detail = stderr.trim();
      reject(
        new Error(
          `cloc failed (exit ${code === null ? 'unknown' : String(code)})` +
            (detail.length > 0 ? `:\n${detail}` : ''),
        ),
      );
    });
  });
}

async function readClocJson(jsonPath: string): Promise<object> {
  try {
    const raw = await fs.promises.readFile(jsonPath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('expected a JSON object');
    }
    return parsed;
  } catch (error) {
    throw new Error(`Failed to read cloc JSON "${jsonPath}": ${describeError(error)}`);
  }
}

function optionalTitle(): string | undefined {
  const title = core.getInput('title').trim();
  if (title.length > 0) {
    return title;
  }

  const repository = process.env['GITHUB_REPOSITORY'];
  return repository !== undefined && repository.length > 0 ? repository : undefined;
}

async function main(): Promise<void> {
  const analyzePath = core.getInput('path') || '.';
  const outputPath = core.getInput('output') || 'dist/docs/loc.svg';
  const fontInput = core.getInput('font').trim();
  const fontPath = fontInput.length > 0 ? fontInput : DEFAULT_FONT_PATH;
  const title = optionalTitle();

  await ensureCloc();

  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'lochy-cloc-'));
  try {
    const jsonPath = await runCloc(analyzePath, tempDir);
    const clocJson = await readClocJson(jsonPath);

    const svg = await renderBadge({
      clocJson,
      fontPath,
      mascotPath: DEFAULT_MASCOT_PATH,
      ...(title === undefined ? {} : { title }),
    });

    const outputDir = path.dirname(path.resolve(outputPath));
    await fs.promises.mkdir(outputDir, { recursive: true });
    await fs.promises.writeFile(outputPath, svg, 'utf8');
    console.log(`Wrote LOChy badge to ${outputPath}`);
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  core.setFailed(describeError(error));
  process.exitCode = 1;
});
