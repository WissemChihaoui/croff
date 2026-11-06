import type { Span } from "./ast.js";

export type ParseErrorCode =
  | "empty"
  | "whitespace"
  | "invalid-character"
  | "invalid-name"
  | "missing-value"
  | "unexpected-token"
  | "unterminated-call"
  | "empty-argument"
  | "unterminated-bracket"
  | "unbalanced-bracket"
  | "empty-bracket"
  | "misplaced-bracket"
  | "trailing-escape"
  | "duplicate-variant"
  | "too-deep"
  | "unsupported-group"
  | "invalid-property";

export interface ParseError {
  code: ParseErrorCode;
  message: string;
  span: Span;
  hint?: string;
}

/** Renders an error with a caret line under the offending source. */
export function formatParseError(error: ParseError, source: string): string {
  const width = Math.max(1, error.span.end - error.span.start);
  const lines = [
    `${error.message} [${error.code}]`,
    `  ${source}`,
    `  ${" ".repeat(error.span.start)}${"^".repeat(width)}`,
  ];
  if (error.hint) lines.push(`  hint: ${error.hint}`);
  return lines.join("\n");
}
