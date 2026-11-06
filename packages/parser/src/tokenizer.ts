import type { Span } from "./ast.js";
import type { ParseError } from "./errors.js";

export type Token =
  | { kind: "word"; value: string; span: Span }
  | { kind: "colon"; span: Span }
  | { kind: "comma"; span: Span }
  | { kind: "lparen"; span: Span }
  | { kind: "rparen"; span: Span }
  | { kind: "bracket"; raw: string; value: string; span: Span }
  | { kind: "eof"; span: Span };

export type TokenizeResult = { ok: true; tokens: Token[] } | { ok: false; error: ParseError };

const WORD_PUNCTUATION = new Set(["-", "_", ".", "/", "%", "#", "+", "*", "!"]);

function isWhitespace(ch: string): boolean {
  return ch === " " || ch === "\t" || ch === "\n" || ch === "\r" || ch === "\f";
}

function isWordChar(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code >= 128 ||
    WORD_PUNCTUATION.has(ch)
  );
}

function whitespaceError(start: number): ParseError {
  return {
    code: "whitespace",
    message: "Expressions cannot contain whitespace because class attributes split on it.",
    span: { start, end: start + 1 },
    hint: "Remove the space. Inside a bracket value, write a space as an underscore: width[calc(100%_-_1px)].",
  };
}

/** Decodes bracket text: `_` becomes a space, except in `url(...)`, and CROFF escapes resolve. */
export function decodeBracket(raw: string): string {
  let out = "";
  let urlDepth = 0;
  let depth = 0;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!;
    if (ch === "\\") {
      const next = raw[i + 1];
      if (next === "_" || next === "(" || next === ")" || next === "[" || next === "]") {
        out += next;
        i++;
      } else if (next === "\\") {
        out += "\\";
        i++;
      } else {
        out += ch;
      }
      continue;
    }
    if (ch === "(") {
      depth++;
      if (urlDepth === 0 && raw.slice(Math.max(0, i - 3), i) === "url") urlDepth = depth;
    } else if (ch === ")") {
      if (urlDepth === depth) urlDepth = 0;
      depth--;
    }
    out += ch === "_" && urlDepth === 0 ? " " : ch;
  }
  return out;
}

function readBracket(source: string, start: number): { token: Token } | { error: ParseError } {
  const stack: string[] = [];
  let quote: string | null = null;
  let i = start + 1;
  for (; i < source.length; i++) {
    const ch = source[i]!;
    if (isWhitespace(ch)) return { error: whitespaceError(i) };
    if (ch === "\\") {
      i++;
      if (i >= source.length) {
        return {
          error: {
            code: "trailing-escape",
            message: "The expression ends in an unfinished escape.",
            span: { start: i - 1, end: i },
          },
        };
      }
      if (isWhitespace(source[i]!)) return { error: whitespaceError(i) };
      continue;
    }
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
    } else if (ch === "(" || ch === "[") {
      stack.push(ch);
    } else if (ch === ")" || ch === "]") {
      if (ch === "]" && stack.length === 0) break;
      const open = stack.pop();
      if ((ch === ")" && open !== "(") || (ch === "]" && open !== "[")) {
        return {
          error: {
            code: "unbalanced-bracket",
            message: `Unexpected "${ch}" inside a bracket value.`,
            span: { start: i, end: i + 1 },
          },
        };
      }
    }
  }
  if (i >= source.length) {
    return {
      error: {
        code: "unterminated-bracket",
        message: 'This "[" has no matching "]".',
        span: { start, end: source.length },
      },
    };
  }
  const raw = source.slice(start + 1, i);
  if (raw.length === 0) {
    return {
      error: {
        code: "empty-bracket",
        message: "A bracket value cannot be empty.",
        span: { start, end: i + 1 },
      },
    };
  }
  return {
    token: { kind: "bracket", raw, value: decodeBracket(raw), span: { start, end: i + 1 } },
  };
}

/** Splits an expression into tokens. Bracket values are read as a single token. */
export function tokenize(source: string): TokenizeResult {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i]!;
    const single = { start: i, end: i + 1 };
    if (isWhitespace(ch)) return { ok: false, error: whitespaceError(i) };
    if (ch === ":") {
      tokens.push({ kind: "colon", span: single });
      i++;
    } else if (ch === ",") {
      tokens.push({ kind: "comma", span: single });
      i++;
    } else if (ch === "(") {
      tokens.push({ kind: "lparen", span: single });
      i++;
    } else if (ch === ")") {
      tokens.push({ kind: "rparen", span: single });
      i++;
    } else if (ch === "[") {
      const result = readBracket(source, i);
      if ("error" in result) return { ok: false, error: result.error };
      tokens.push(result.token);
      i = result.token.span.end;
    } else if (ch === "\\" || isWordChar(ch)) {
      const start = i;
      let value = "";
      while (i < source.length) {
        const c = source[i]!;
        if (c === "\\") {
          const next = source[i + 1];
          if (next === undefined) {
            return {
              ok: false,
              error: {
                code: "trailing-escape",
                message: "The expression ends in an unfinished escape.",
                span: { start: i, end: i + 1 },
              },
            };
          }
          if (isWhitespace(next)) return { ok: false, error: whitespaceError(i + 1) };
          value += next;
          i += 2;
        } else if (isWordChar(c)) {
          value += c;
          i++;
        } else {
          break;
        }
      }
      tokens.push({ kind: "word", value, span: { start, end: i } });
    } else {
      return {
        ok: false,
        error: {
          code: "invalid-character",
          message: `The character "${ch}" is not allowed here.`,
          span: single,
          hint: "Escape it with a backslash, or use a bracket value for raw CSS.",
        },
      };
    }
  }
  tokens.push({ kind: "eof", span: { start: source.length, end: source.length } });
  return { ok: true, tokens };
}
