/**
 * GitHub Linguist canonical programming language registry and normalizer.
 * Used to distinguish valid GitHub `language:XXX` search qualifiers from
 * frameworks, tools, and non-language skills.
 */

const LINGUIST_LANGUAGES: readonly string[] = [
  'ActionScript',
  'Ada',
  'Apex',
  'Assembly',
  'C',
  'C#',
  'C++',
  'Clojure',
  'COBOL',
  'CoffeeScript',
  'Common Lisp',
  'Crystal',
  'CSS',
  'D',
  'Dart',
  'Elixir',
  'Elm',
  'Emacs Lisp',
  'Erlang',
  'F#',
  'Fortran',
  'Go',
  'Groovy',
  'Haskell',
  'HTML',
  'Java',
  'JavaScript',
  'Julia',
  'Kotlin',
  'Lua',
  'Makefile',
  'MATLAB',
  'Nim',
  'Nix',
  'Objective-C',
  'OCaml',
  'Pascal',
  'Perl',
  'PHP',
  'PowerShell',
  'Prolog',
  'Python',
  'R',
  'Racket',
  'Ruby',
  'Rust',
  'Scala',
  'Scheme',
  'Shell',
  'Solidity',
  'SQL',
  'Swift',
  'TypeScript',
  'V',
  'Vala',
  'Verilog',
  'VHDL',
  'Visual Basic .NET',
  'Vue',
  'WebAssembly',
  'Zig',
] as const;

// Common abbreviations and aliases mapped to canonical Linguist names
const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  py: 'Python',
  python: 'Python',
  golang: 'Go',
  go: 'Go',
  rb: 'Ruby',
  ruby: 'Ruby',
  rs: 'Rust',
  rust: 'Rust',
  cpp: 'C++',
  'c++': 'C++',
  cs: 'C#',
  csharp: 'C#',
  'c#': 'C#',
  c: 'C',
  php: 'PHP',
  sh: 'Shell',
  bash: 'Shell',
  zsh: 'Shell',
  shell: 'Shell',
  kt: 'Kotlin',
  kotlin: 'Kotlin',
  swift: 'Swift',
  dart: 'Dart',
  java: 'Java',
  elixir: 'Elixir',
  erlang: 'Erlang',
  haskell: 'Haskell',
  hs: 'Haskell',
  lua: 'Lua',
  r: 'R',
  scala: 'Scala',
  zig: 'Zig',
  sol: 'Solidity',
  solidity: 'Solidity',
  sql: 'SQL',
  html: 'HTML',
  css: 'CSS',
};

const LINGUIST_SET = new Set<string>(LINGUIST_LANGUAGES.map((l) => l.toLowerCase()));

/**
 * Checks whether a given string is recognized as a valid GitHub Linguist language.
 */
export function isLinguistLanguage(candidate: string | null | undefined): boolean {
  if (!candidate || typeof candidate !== 'string') return false;
  const clean = candidate.trim().toLowerCase();
  return LINGUIST_SET.has(clean) || clean in LANGUAGE_ALIASES;
}

/**
 * Resolves a language string to its canonical GitHub Linguist language name.
 * Returns null if the string is not a recognized programming language.
 */
export function normalizeLinguistLanguage(candidate: string | null | undefined): string | null {
  if (!candidate || typeof candidate !== 'string') return null;
  const clean = candidate.trim().toLowerCase();

  if (LANGUAGE_ALIASES[clean]) {
    return LANGUAGE_ALIASES[clean];
  }

  for (const lang of LINGUIST_LANGUAGES) {
    if (lang.toLowerCase() === clean) {
      return lang;
    }
  }

  return null;
}

/**
 * Returns a copy of the canonical list of recognized Linguist languages.
 */
export function getLinguistLanguages(): string[] {
  return [...LINGUIST_LANGUAGES];
}
