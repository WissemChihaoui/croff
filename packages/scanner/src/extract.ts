/**
 * Candidate extraction. Pure and browser-safe: it reads text and nothing else,
 * and never evaluates code, so class names assembled at runtime cannot be seen.
 */

export type CandidateContext =
  /** Inside a class attribute or a class helper call such as `cx(...)`. */
  | "class"
  /** Directly after a quote, somewhere else. */
  | "string"
  /** Anywhere else. */
  | "code";

export interface Candidate {
  expression: string;
  context: CandidateContext;
  /** Zero-based line of the first occurrence. */
  line: number;
  /** Zero-based column of the first occurrence. */
  column: number;
}

export interface DynamicExpression {
  /** The raw source text, e.g. "bg(${color})". */
  text: string;
  context: CandidateContext;
  line: number;
  column: number;
}

export interface ExtractResult {
  candidates: Candidate[];
  /** Expression-shaped text with interpolation, which can never be compiled. */
  dynamic: DynamicExpression[];
  /** Expressions in a class context broken up by whitespace, e.g. `width[calc(1px - 2px)]`. */
  broken: DynamicExpression[];
}

export interface ExtractOptions {
  /** Function names whose arguments are class names. */
  classFunctions?: string[];
}

export const DEFAULT_CLASS_FUNCTIONS = ["cx", "clsx", "classnames", "classNames", "cn", "cva"];

const MAX_CANDIDATE_LENGTH = 512;

function isWhitespace(code: number): boolean {
  return code === 32 || code === 10 || code === 9 || code === 13 || code === 12;
}

function isQuote(code: number): boolean {
  return code === 34 || code === 39 || code === 96;
}

/** Variant prefixes then a utility name then `(` or `[`; or variants then a group's `(`. */
const CANDIDATE_SHAPE =
  /^(?:(?:[a-z0-9][a-z0-9-]*:)+\(|(?:[a-z0-9][a-z0-9-]*:)*[a-z][a-z0-9-]*[([])/;

interface Span {
  start: number;
  end: number;
}

/** Skips a JavaScript-like string, returning the index just after it. */
function skipString(source: string, start: number, spans: Span[] | null): number {
  const quote = source[start]!;
  let i = start + 1;
  let segment = i;
  while (i < source.length) {
    const ch = source[i]!;
    if (ch === "\\") {
      i += 2;
    } else if (ch === quote) {
      spans?.push({ start: segment, end: i });
      return i + 1;
    } else if (quote === "`" && ch === "$" && source[i + 1] === "{") {
      spans?.push({ start: segment, end: i });
      i = walkCode(source, i + 2, "}", spans);
      segment = i;
    } else if (quote !== "`" && ch === "\n") {
      // An unterminated string: stop here rather than swallowing the file.
      spans?.push({ start: segment, end: i });
      return i;
    } else {
      i++;
    }
  }
  spans?.push({ start: segment, end: i });
  return i;
}

/**
 * Walks code from `start` until the matching `close`, recording string contents
 * in `spans`. Returns the index just after the closing character.
 */
function walkCode(source: string, start: number, close: "}" | ")", spans: Span[] | null): number {
  const open = close === "}" ? "{" : "(";
  let depth = 1;
  let i = start;
  while (i < source.length) {
    const ch = source[i]!;
    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipString(source, i, spans);
    } else if (ch === open) {
      depth++;
      i++;
    } else if (ch === close) {
      depth--;
      i++;
      if (depth === 0) return i;
    } else if (ch === "/" && source[i + 1] === "/") {
      const newline = source.indexOf("\n", i);
      i = newline === -1 ? source.length : newline;
    } else if (ch === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      i = end === -1 ? source.length : end + 2;
    } else {
      i++;
    }
  }
  return i;
}

/** Finds the regions of a file that hold class names. */
function classRegions(source: string, functions: string[]): Span[] {
  const spans: Span[] = [];

  const attribute = /(?:^|[\s:])(?:class|className|class:list)\s*=\s*/g;
  for (let match = attribute.exec(source); match; match = attribute.exec(source)) {
    const start = match.index + match[0].length;
    const ch = source[start];
    if (ch === '"' || ch === "'" || ch === "`") {
      const collected: Span[] = [];
      const end = skipAttributeValue(source, start, collected);
      spans.push(...collected);
      attribute.lastIndex = end;
    } else if (ch === "{") {
      attribute.lastIndex = walkCode(source, start + 1, "}", spans);
    } else {
      let end = start;
      while (end < source.length && !isWhitespace(source.charCodeAt(end)) && source[end] !== ">")
        end++;
      spans.push({ start, end });
      attribute.lastIndex = end;
    }
  }

  if (functions.length > 0) {
    const names = functions.map((name) => name.replace(/[^a-zA-Z0-9_$]/g, "")).join("|");
    const call = new RegExp(`(?:^|[^a-zA-Z0-9_$.])(?:${names})\\(`, "g");
    for (let match = call.exec(source); match; match = call.exec(source)) {
      call.lastIndex = walkCode(source, match.index + match[0].length, ")", spans);
    }
  }
  return spans.sort((a, b) => a.start - b.start);
}

/** Reads a quoted attribute value. Unlike a JS string, it may span lines. */
function skipAttributeValue(source: string, start: number, spans: Span[]): number {
  const quote = source[start]!;
  if (quote === "`") return skipString(source, start, spans);
  const end = source.indexOf(quote, start + 1);
  const stop = end === -1 ? source.length : end;
  spans.push({ start: start + 1, end: stop });
  return stop + 1;
}

function lineStarts(source: string): number[] {
  const starts = [0];
  for (let i = source.indexOf("\n"); i !== -1; i = source.indexOf("\n", i + 1)) starts.push(i + 1);
  return starts;
}

function locate(starts: number[], offset: number): { line: number; column: number } {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (starts[middle]! <= offset) low = middle;
    else high = middle - 1;
  }
  return { line: low, column: offset - starts[low]! };
}

/** Reads a balanced token starting at `start`. Stops at a top-level delimiter. */
function readToken(
  source: string,
  start: number,
): { end: number; dynamic: boolean; balanced: boolean; hitWhitespace: boolean } {
  let i = start;
  let dynamic = false;
  let hitWhitespace = false;
  const stack: number[] = [];
  let quote = 0;

  while (i < source.length && i - start <= MAX_CANDIDATE_LENGTH) {
    const code = source.charCodeAt(i);
    if (code === 92) {
      i += 2;
      continue;
    }
    if (code === 36 && source.charCodeAt(i + 1) === 123) {
      // "${": skip the interpolation, it can't be part of a static expression.
      dynamic = true;
      let depth = 1;
      i += 2;
      while (i < source.length && depth > 0) {
        const c = source.charCodeAt(i);
        if (c === 123) depth++;
        else if (c === 125) depth--;
        i++;
      }
      continue;
    }
    if (quote) {
      if (isWhitespace(code)) {
        hitWhitespace = true;
        break;
      }
      if (code === quote) quote = 0;
      i++;
      continue;
    }
    if (isWhitespace(code)) {
      if (stack.length > 0) hitWhitespace = true;
      break;
    }
    if (isQuote(code)) {
      if (stack.length === 0) break;
      // Only bracket values may contain quotes.
      if (!stack.includes(91)) break;
      quote = code;
      i++;
      continue;
    }
    if (code === 40 || code === 91) {
      stack.push(code);
    } else if (code === 41 || code === 93) {
      const open = stack.pop();
      if (open === undefined || (code === 41) !== (open === 40)) {
        return { end: i, dynamic, balanced: false, hitWhitespace };
      }
      // The first balanced close ends the expression; whatever follows is checked by the caller.
      if (stack.length === 0) return { end: i + 1, dynamic, balanced: true, hitWhitespace };
    } else if (code === 62 && stack.length === 0) {
      // ">" ends an unquoted attribute value.
      break;
    }
    i++;
  }
  return { end: i, dynamic, balanced: stack.length === 0 && quote === 0, hitWhitespace };
}

/**
 * Finds every expression-shaped token in `source`. A token must begin after
 * whitespace, a quote or `=`, and end at whitespace, a quote, `>` or the end of
 * the text. This is what keeps `foo.width(10)` and `width(10);` out.
 */
export function extractCandidates(source: string, options: ExtractOptions = {}): ExtractResult {
  const regions = classRegions(source, options.classFunctions ?? DEFAULT_CLASS_FUNCTIONS);
  const starts = lineStarts(source);
  const candidates: Candidate[] = [];
  const dynamic: DynamicExpression[] = [];
  const broken: DynamicExpression[] = [];
  const seen = new Map<string, Candidate>();
  let regionIndex = 0;

  const inClassRegion = (offset: number): boolean => {
    while (regionIndex < regions.length && regions[regionIndex]!.end <= offset) regionIndex++;
    const region = regions[regionIndex];
    return region !== undefined && region.start <= offset;
  };

  let i = 0;
  while (i < source.length) {
    const code = source.charCodeAt(i);
    const previous = i === 0 ? 32 : source.charCodeAt(i - 1);
    const atBoundary = isWhitespace(previous) || isQuote(previous) || previous === 61;
    // Only letters and digits can start an expression.
    const startsWord = (code >= 97 && code <= 122) || (code >= 48 && code <= 57);
    if (!atBoundary || !startsWord) {
      i++;
      continue;
    }

    const token = readToken(source, i);
    const text = source.slice(i, token.end);
    if (!CANDIDATE_SHAPE.test(text)) {
      // Not an expression; move past this word, but stay inside any brackets it opens.
      i = Math.max(i + 1, firstBreak(source, i));
      continue;
    }

    const context: CandidateContext = inClassRegion(i)
      ? "class"
      : isQuote(previous)
        ? "string"
        : "code";
    const nextCode = source.charCodeAt(token.end);
    const endsCleanly =
      token.end >= source.length || isWhitespace(nextCode) || isQuote(nextCode) || nextCode === 62;

    if (token.dynamic) {
      dynamic.push({ text, context, ...locate(starts, i) });
      // Rescan the interpolation, because its strings may hold real expressions.
      i = source.indexOf("${", i) + 2;
    } else if (token.hitWhitespace || !token.balanced) {
      if (token.hitWhitespace && context === "class") {
        const end = source.indexOf("\n", token.end);
        const line = source.slice(i, end === -1 ? source.length : end);
        const quoteEnd = line.search(/["'`]/);
        broken.push({
          text: quoteEnd === -1 ? line : line.slice(0, quoteEnd),
          context,
          ...locate(starts, i),
        });
      }
      i = Math.max(i + 1, token.end);
    } else {
      if (endsCleanly) {
        const existing = seen.get(text);
        if (!existing) {
          const candidate: Candidate = { expression: text, context, ...locate(starts, i) };
          seen.set(text, candidate);
          candidates.push(candidate);
        } else if (context === "class" && existing.context !== "class") {
          existing.context = "class";
        } else if (context === "string" && existing.context === "code") {
          existing.context = "string";
        }
      }
      i = Math.max(i + 1, token.end);
    }
  }
  return { candidates, dynamic, broken };
}

function firstBreak(source: string, start: number): number {
  let i = start;
  while (i < source.length) {
    const code = source.charCodeAt(i);
    if (isWhitespace(code) || isQuote(code) || code === 40 || code === 91 || code === 61) return i;
    i++;
  }
  return i;
}
