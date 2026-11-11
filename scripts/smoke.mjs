// Smoke test for the built action: runs bundle/index.js the way the Actions
// runner does (INPUT_* environment variables) against fixtures/sample-repo and
// asserts on the produced SVG.
//
//   npm run build && npm test
//
// cloc is required. When it is missing the smoke skips with exit 0 — the
// action's own install path covers CI, where cloc is installed on demand.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FIXTURE = join(ROOT, 'fixtures', 'sample-repo');
const BUNDLE = join(ROOT, 'bundle', 'index.js');

// fixtures/sample-repo:
//   index.ts        3 code lines
//   README.md       1 code line
//   vendor/junk.js  50 code lines  (excluded: default exclude-dir)
//   package-lock.json 31 code lines (excluded: default lock-file filter)
// so the default run totals 4, and a run that clears the lock filter totals 35.
const EXPECTED_TOTAL = '4';
const EXPECTED_TOTAL_WITH_LOCKS = '35';

function haveCloc() {
  return spawnSync('sh', ['-c', 'command -v cloc'], { stdio: 'ignore' }).status === 0;
}

function run(outlineText, excludeFiles) {
  const outDir = mkdtempSync(join(tmpdir(), 'lochy-smoke-'));
  const output = join(outDir, 'loc.svg');

  const env = {
    ...process.env,
    INPUT_PATH: FIXTURE,
    INPUT_OUTPUT: output,
    INPUT_OUTLINE_TEXT: outlineText,
    INPUT_EXCLUDE: 'node_modules,vendor,bundle,build,dist,coverage',
    INPUT_TITLE: 'smoke/fixture',
    GITHUB_REPOSITORY: 'smoke/fixture',
  };

  // undefined = "input not provided" (the action's own default applies);
  // '' = explicitly blank, which the action reads as "no lock filter".
  if (excludeFiles !== undefined) {
    env.INPUT_EXCLUDE_FILES = excludeFiles;
  } else {
    delete env.INPUT_EXCLUDE_FILES;
  }

  const result = spawnSync('node', [BUNDLE], {
    cwd: ROOT,
    encoding: 'utf8',
    env,
  });

  if (result.status !== 0) {
    throw new Error(`action exited ${result.status}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);
  }

  const svg = readFileSync(output, 'utf8');
  rmSync(outDir, { recursive: true, force: true });
  return svg;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`ok - ${message}`);
}

if (!haveCloc()) {
  console.log('SKIP: cloc not on PATH (CI installs it via the action under test)');
  process.exit(0);
}

const outlined = run('true');
assert(outlined.startsWith('<svg'), 'outlined badge is an <svg>');
assert(outlined.includes('<title>'), 'outlined badge carries a <title>');
assert(
  (outlined.match(/class="glyph"/g) ?? []).length > 0,
  'outlined badge bakes text to glyph outlines',
);

const text = run('false');
assert(text.includes('<text '), 'text mode emits <text> elements');
assert(!text.includes('class="glyph"'), 'text mode embeds no glyph paths');
assert(text.includes(`aria-label="`), 'text mode is aria-labelled');

const total = /<text[^>]*>(\d+(?:\.\d+)?[kM]?)<\/text>/.exec(text);
assert(total !== null, 'text mode exposes the total as readable text');
assert(total[1] === EXPECTED_TOTAL, `total counts source only, not excluded dirs or lock files (got ${total?.[1]})`);

const withLocks = run('false', '');
const lockTotal = /<text[^>]*>(\d+(?:\.\d+)?[kM]?)<\/text>/.exec(withLocks);
assert(
  lockTotal?.[1] === EXPECTED_TOTAL_WITH_LOCKS,
  `clearing the lock filter brings lock files back into scope (got ${lockTotal?.[1]})`,
);

console.log('\nSMOKE OK');