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

/**
 * Directories cloc never counts by default. Generated and vendored code would
 * otherwise dominate the badge: a committed action bundle or a checked-in
 * `node_modules` is routinely two orders of magnitude larger than the source.
 */
const DEFAULT_EXCLUDE = ['node_modules', 'vendor', 'bundle', 'build', 'dist', 'coverage'];

/**
 * Generated lock files cloc never counts by default. They are machine-written,
 * are the single largest line source in most JS repos, and describe dependency
 * resolution rather than code. Hand-written manifests (package.json,
 * tsconfig.json) stay in scope — they are authored files.
 */
const DEFAULT_EXCLUDE_FILES = [
  'package-lock\\.json$',
  'npm-shrinkwrap\\.json$',
  'pnpm-lock\\.yaml$',
  'yarn\\.lock$',
  'bun\\.lockb?$',
  'Cargo\\.lock$',
  'poetry\\.lock$',
  'Pipfile\\.lock$',
  'composer\\.lock$',
  'Gemfile\\.lock$',
  'packages\\.lock\\.json$',
  'go\\.sum$',
].join('|');

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function clocIsAvailable(): boolean {
  const result = spawnSync('sh', ['-c', 'command -v cloc'], {
    stdio: 'ignore',
  });
  return result.status === 0;
}

function runInstall(command: string): boolean {
  const result = spawnSync('sh', ['-c', command], {
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  return result.error === undefined && result.status === 0;
}

/**
 * cloc is not on the GitHub-hosted ubuntu images, so the action installs it on
 * demand. The package lists are usually warm — only fall back to `apt-get
 * update` when the direct install fails, and never let a failed install look
 * like a success.
 */
function installCloc(): void {
  const hasApt = spawnSync('sh', ['-c', 'command -v apt-get'], { stdio: 'ignore' });
  if (hasApt.status !== 0) {
    throw new Error(
      'cloc is not installed and this runner has no apt-get. Install cloc on the ' +
        'runner (or make it available on PATH) and re-run the action.',
    );
  }

  console.log('cloc not found on PATH; installing with apt-get');
  if (runInstall('sudo apt-get install -y cloc') && clocIsAvailable()) {
    return;
  }

  console.log('direct install failed; refreshing package lists and retrying');
  if (!runInstall('sudo apt-get update && sudo apt-get install -y cloc') || !clocIsAvailable()) {
    throw new Error(
      'cloc is not installed and could not be installed with apt-get. Install cloc on ' +
        'the runner (or make it available on PATH) and re-run the action.',
    );
  }
}

async function ensureCloc(): Promise<void> {
  if (clocIsAvailable()) {
    return;
  }

  installCloc();

  if (!clocIsAvailable()) {
    throw new Error(
      'cloc was installed but is still not on PATH. Check the runner image and re-run.',
    );
  }
}

/**
 * The runner always exports INPUT_EXCLUDE_FILES (action.yml supplies a
 * default), so "absent" and "explicitly blank" have to be told apart: absent
 * means a direct bundle run without inputs, blank means the consumer asked for
 * no filter at all.
 */
function excludeFilesFilter(): string | undefined {
  const raw = process.env['INPUT_EXCLUDE_FILES'];
  if (raw === undefined) {
    return DEFAULT_EXCLUDE_FILES;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function excludeDirs(): string[] {
  const raw = core.getInput('exclude').trim();
  const list = (raw.length > 0 ? raw : DEFAULT_EXCLUDE.join(','))
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return list.length > 0 ? list : DEFAULT_EXCLUDE;
}

function runCloc(analyzePath: string, tempDir: string): Promise<string> {
  const jsonPath = path.join(tempDir, 'cloc.json');
  const args = [analyzePath, '--json', '--quiet', `--exclude-dir=${excludeDirs().join(',')}`];

  const excludeFiles = excludeFilesFilter();
  if (excludeFiles !== undefined) {
    args.push(`--not-match-f=${excludeFiles}`);
  }

  if (fs.existsSync(path.join(analyzePath, '.git'))) {
    args.push('--vcs=git');
  }

  return new Promise((resolve, reject) => {
    const child = spawn('cloc', [...args, `--out=${jsonPath}`], {
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
  const mascotInput = core.getInput('mascot').trim();
  const mascotPath = mascotInput.length > 0 ? mascotInput : DEFAULT_MASCOT_PATH;
  const outlineText = core.getBooleanInput('outline_text');
  const title = optionalTitle();

  await ensureCloc();

  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'lochy-cloc-'));
  try {
    const jsonPath = await runCloc(analyzePath, tempDir);
    const clocJson = await readClocJson(jsonPath);

    const svg = await renderBadge({
      clocJson,
      fontPath,
      mascotPath,
      outlineText,
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