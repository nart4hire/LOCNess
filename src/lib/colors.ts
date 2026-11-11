/**
 * Language colours for the badge bars.
 *
 * Hues come from GitHub Linguist, which is tuned for a *light* UI. The badge is
 * a dark card, and several linguist colours (json, powershell, lua, ruby, …)
 * land within a few percent of the bar track — the bar renders as a blank
 * slot. `ensureVisible` lifts any colour that cannot clear MIN_BAR_CONTRAST
 * against the track, so the map can keep the recognisable hue and the badge
 * stays readable as the map grows.
 *
 * `barColorFor` goes one step further: a bar's weight should track its share of
 * the repo, not its hue, so small shares are mixed toward the track.
 *
 * Keys are lower-cased so lookups are insensitive to cloc's casing; unknown
 * languages (including the synthetic "Others" row) use FALLBACK_COLOR.
 */

/** Track the bars sit on. render.ts imports this so the two cannot drift. */
export const BAR_TRACK_COLOR = '#21262d';

/** Minimum WCAG contrast ratio between a bar and the track it sits on. */
const MIN_BAR_CONTRAST = 3;

/** How far a colour is pushed toward white per lift step. */
const LIFT_STEP = 0.06;
const MAX_LIFT_STEPS = 24;

const LANGUAGE_COLORS: Readonly<Record<string, string>> = {
  typescript: '#3178c6',
  javascript: '#f1e05a',
  python: '#3572A5',
  go: '#00ADD8',
  rust: '#dea584',
  java: '#b07219',
  c: '#555555',
  'c++': '#f34b7d',
  'c#': '#178600',
  html: '#e34c26',
  css: '#563d7c',
  ruby: '#701516',
  php: '#4F5D95',
  shell: '#89e051',
  swift: '#F05138',
  kotlin: '#A97BFF',
  dart: '#00B4AB',
  markdown: '#083fa1',
  json: '#292929',
  yaml: '#cb171e',
  vue: '#41b883',
  svelte: '#ff3e00',
  scala: '#c22d40',
  lua: '#000080',
  perl: '#0298c3',
  r: '#198CE7',
  'objective-c': '#438eff',
  haskell: '#5e5086',
  elixir: '#6e4a7e',
  zig: '#ec915c',
  nix: '#7e7eff',
  dockerfile: '#384d54',
  makefile: '#427819',
  powershell: '#012456',
  sql: '#e38c00',
  tex: '#3D6117',
  'vim script': '#199f4b',
  assembly: '#6E4C13',
  clojure: '#db5855',
  erlang: '#B83998',
  ocaml: '#ef7a08',
  julia: '#a270ba',
  solidity: '#AA6746',
  cmake: '#DA3434',
  coffeescript: '#244776',
  crystal: '#000100',
  d: '#ba595e',
  elm: '#60B5CC',
  'f#': '#b845fc',
  'fortran 77': '#4d41b1',
  'fortran 90': '#4d41b1',
  gdscript: '#355570',
  gleam: '#ffaff3',
  groovy: '#4298b0',
  hcl: '#844FBA',
  haxe: '#df7900',
  ini: '#d1dbe0',
  json5: '#267CB9',
  lean: '#000000',
  less: '#1d365d',
  matlab: '#e16737',
  mathematica: '#dd1100',
  nim: '#ffc200',
  pascal: '#E3F171',
  prolog: '#74283c',
  'protocol buffers': '#e98600',
  racket: '#3c5caa',
  scss: '#c6538c',
  sass: '#a53b70',
  scheme: '#1e4aec',
  slim: '#2b2b2b',
  smalltalk: '#596706',
  stylus: '#ff6347',
  toml: '#9c4221',
  vala: '#a56de2',
  'visual basic': '#945db7',
  webassembly: '#04133b',
  xaml: '#0C54C6',
  xml: '#0060ac',
  xtend: '#24323d',
  zsh: '#3a5d3f',
};

export const FALLBACK_COLOR = '#8b8b8b';

type Rgb = { r: number; g: number; b: number };

function parseHex(hex: string): Rgb | undefined {
  const value = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    return undefined;
  }
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function toHex({ r, g, b }: Rgb): string {
  const part = (channel: number) =>
    Math.round(Math.min(255, Math.max(0, channel)))
      .toString(16)
      .padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance({ r, g, b }: Rgb): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

export function contrastRatio(a: string, b: string): number {
  const left = parseHex(a);
  const right = parseHex(b);
  if (left === undefined || right === undefined) {
    return 1;
  }
  const la = luminance(left);
  const lb = luminance(right);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

function mixWithWhite({ r, g, b }: Rgb, amount: number): Rgb {
  const mix = (channel: number) => channel + (255 - channel) * amount;
  return { r: mix(r), g: mix(g), b: mix(b) };
}

/**
 * Lift a colour toward white until it clears MIN_BAR_CONTRAST against the bar
 * track. Pure function of the input, so a given language always renders the
 * same colour.
 */
export function ensureVisible(hex: string): string {
  const start = parseHex(hex);
  if (start === undefined) {
    return FALLBACK_COLOR;
  }

  let current = start;
  for (let step = 0; step < MAX_LIFT_STEPS; step += 1) {
    if (contrastRatio(toHex(current), BAR_TRACK_COLOR) >= MIN_BAR_CONTRAST) {
      return toHex(current);
    }
    current = mixWithWhite(current, LIFT_STEP);
  }
  return toHex(current);
}

export function colorFor(language: string): string {
  const raw = LANGUAGE_COLORS[language.trim().toLowerCase()] ?? FALLBACK_COLOR;
  return ensureVisible(raw);
}

/** Linear mix of two hex colours; amount is 0..1 toward `target`. */
function mixToward(source: string, target: string, amount: number): string {
  const from = parseHex(source);
  const to = parseHex(target);
  if (from === undefined || to === undefined) {
    return source;
  }
  const clamped = Math.min(1, Math.max(0, amount));
  const channel = (a: number, b: number) => a + (b - a) * clamped;
  return toHex({
    r: channel(from.r, to.r),
    g: channel(from.g, to.g),
    b: channel(from.b, to.b),
  });
}

/**
 * Share at which a bar is drawn at full strength. Below it the fill is mixed
 * toward the track so a 2%-of-repo language does not out-shout a 60% one just
 * because its hue happens to be the lightest on the card.
 */
const FULL_STRENGTH_SHARE = 0.25;

/** How far the dimmest bar is pushed toward the track. */
const MAX_DIM = 0.24;

export function barColorFor(language: string, share: number): string {
  const base = colorFor(language);
  const strength = Math.max(0, Math.min(1, share / FULL_STRENGTH_SHARE));
  const amount = (1 - strength) * MAX_DIM;
  return amount <= 0 ? base : mixToward(base, BAR_TRACK_COLOR, amount);
}