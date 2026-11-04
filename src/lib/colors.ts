/**
 * GitHub Linguist colours for common languages.
 *
 * Keys are lower-cased so lookups are insensitive to cloc's casing; unknown
 * languages (including the synthetic "Others" row) use a neutral grey.
 */
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
};

export const FALLBACK_COLOR = '#8b8b8b';

export function colorFor(language: string): string {
  return LANGUAGE_COLORS[language.trim().toLowerCase()] ?? FALLBACK_COLOR;
}
