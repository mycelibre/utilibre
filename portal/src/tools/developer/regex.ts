export interface RegexLimits {
  maxPatternLength?: number;
  maxInputLength?: number;
  maxMatches?: number;
  maxCapturedCharacters?: number;
}

export interface RegexMatch {
  index: number;
  value: string;
  captures: Array<string | null>;
  groups: Record<string, string>;
}

export interface RegexResult {
  matches: RegexMatch[];
  truncated: boolean;
  riskWarnings: RegexRisk[];
}

export type RegexRisk = 'nested-quantifier' | 'backreference' | 'lookbehind';

const DEFAULT_MAX_PATTERN_LENGTH = 512;
const DEFAULT_MAX_INPUT_LENGTH = 50_000;
const DEFAULT_MAX_MATCHES = 1_000;
const DEFAULT_MAX_CAPTURED_CHARACTERS = 250_000;
const ALLOWED_FLAGS = new Set(['d', 'g', 'i', 'm', 's', 'u', 'v', 'y']);

/**
 * Runs a bounded JavaScript regular expression. Call this inside a disposable
 * Web Worker when accepting an arbitrary pattern: JavaScript cannot interrupt
 * a single catastrophic RegExp execution on the main thread.
 */
export function runRegex(
  pattern: string,
  flags: string,
  input: string,
  limits: RegexLimits = {},
): RegexResult {
  const maxPatternLength = limits.maxPatternLength ?? DEFAULT_MAX_PATTERN_LENGTH;
  const maxInputLength = limits.maxInputLength ?? DEFAULT_MAX_INPUT_LENGTH;
  const maxMatches = limits.maxMatches ?? DEFAULT_MAX_MATCHES;
  const maxCapturedCharacters = limits.maxCapturedCharacters ?? DEFAULT_MAX_CAPTURED_CHARACTERS;
  validatePositiveInteger(maxPatternLength, 'pattern length');
  validatePositiveInteger(maxInputLength, 'input length');
  validatePositiveInteger(maxMatches, 'match count');
  validatePositiveInteger(maxCapturedCharacters, 'captured text');
  if (pattern.length > maxPatternLength) throw new Error(`The pattern exceeds ${maxPatternLength} characters.`);
  if (input.length > maxInputLength) throw new Error(`The test text exceeds ${maxInputLength} characters.`);
  const normalizedFlags = normalizeRegexFlags(flags);

  let expression: RegExp;
  try {
    expression = new RegExp(pattern, normalizedFlags);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'The regular expression is invalid.', { cause: error });
  }

  const matches: RegexMatch[] = [];
  let capturedCharacters = 0;
  let truncated = false;
  const repeated = expression.global || expression.sticky;
  while (matches.length < maxMatches) {
    const match = expression.exec(input);
    if (!match) break;
    const captures = match.slice(1).map((value) => value ?? null);
    const groups = match.groups ? { ...match.groups } : {};
    capturedCharacters += match[0].length;
    for (const capture of captures) capturedCharacters += capture?.length ?? 0;
    if (capturedCharacters > maxCapturedCharacters) {
      truncated = true;
      break;
    }
    matches.push({ index: match.index, value: match[0], captures, groups });
    if (!repeated) break;
    if (match[0].length === 0) expression.lastIndex = advanceStringIndex(input, expression.lastIndex, expression.unicode);
  }
  if (matches.length === maxMatches) truncated = true;
  return { matches, truncated, riskWarnings: analyzeRegexRisk(pattern) };
}

export function normalizeRegexFlags(flags: string): string {
  const normalized = flags.trim();
  const seen = new Set<string>();
  for (const flag of normalized) {
    if (!ALLOWED_FLAGS.has(flag)) throw new Error(`Unsupported regular-expression flag: ${flag}.`);
    if (seen.has(flag)) throw new Error(`Duplicate regular-expression flag: ${flag}.`);
    seen.add(flag);
  }
  if (seen.has('u') && seen.has('v')) throw new Error('The u and v flags cannot be combined.');
  return normalized;
}

export function analyzeRegexRisk(pattern: string): RegexRisk[] {
  const warnings: RegexRisk[] = [];
  if (/\((?:\\.|\[(?:\\.|[^\]])*\]|[^()])*[+*](?:[^()]*)\)[+*{]/.test(pattern)) warnings.push('nested-quantifier');
  if (/\\(?:[1-9]|k<[^>]+>)/.test(pattern)) warnings.push('backreference');
  if (/\(\?<=[\s\S]|\(\?<![\s\S]/.test(pattern)) warnings.push('lookbehind');
  return warnings;
}

function advanceStringIndex(input: string, index: number, unicode: boolean): number {
  if (!unicode || index + 1 >= input.length) return index + 1;
  const first = input.charCodeAt(index);
  if (first < 0xd800 || first > 0xdbff) return index + 1;
  const second = input.charCodeAt(index + 1);
  return second >= 0xdc00 && second <= 0xdfff ? index + 2 : index + 1;
}

function validatePositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`The ${label} limit must be a positive integer.`);
}
