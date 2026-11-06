import type { CompileFailure } from "@croff/compiler";
import { formatParseError, parse } from "@croff/parser";
import type { ScannedCandidate, ScannedExpression } from "@croff/scanner";

export type DiagnosticSeverity = "error" | "warning";

export interface Diagnostic {
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  expression?: string;
  hint?: string;
  suggestion?: string;
  file?: string;
  /** Zero-based. */
  line?: number;
  /** Zero-based. */
  column?: number;
}

function location(item: { file: string; line: number; column: number }) {
  return { file: item.file, line: item.line, column: item.column };
}

/**
 * Decides how much a failed candidate matters, based on where it was found.
 *
 * - In a class attribute it is definitely meant as a utility: report an error.
 * - In some other string it may be anything; a known utility name with a bad
 *   value is worth a warning, and an unknown name is ignored.
 * - In plain code it is probably a function call: stay silent.
 *
 * A utility that throws or produces unusable CSS has a bug wherever it was found, so that is
 * always reported.
 */
export function diagnoseFailure(
  failure: CompileFailure,
  candidate: ScannedCandidate | undefined,
): Diagnostic | undefined {
  const context = candidate?.context ?? "class";
  const faulty =
    failure.phase === "resolve" &&
    (failure.error.code === "utility-error" || failure.error.code === "unsafe-output");
  if (context === "code" && !faulty) return undefined;

  // Point at the exact place in the class.
  const offset = failure.phase === "parse" ? failure.error.span.start : 0;
  const where = candidate ? { ...location(candidate), column: candidate.column + offset } : {};
  const { expression } = failure;

  if (failure.phase === "parse") {
    // Text that merely fails to parse may be anything, but this shape is recognizable.
    const isGroup = failure.error.code === "unsupported-group";
    if (context !== "class" && !isGroup) return undefined;
    return {
      severity: context === "class" ? "error" : "warning",
      code: failure.error.code,
      message: formatParseError(failure.error, expression),
      expression,
      ...(failure.error.hint ? { hint: failure.error.hint } : {}),
      ...where,
    };
  }

  const { error } = failure;
  if (
    context === "string" &&
    (error.code === "unknown-utility" || error.code === "unknown-variant")
  ) {
    return undefined;
  }
  return {
    severity: context === "class" ? "error" : "warning",
    code: error.code,
    message: error.message,
    expression,
    ...(error.hint ? { hint: error.hint } : {}),
    ...(error.suggestion ? { suggestion: error.suggestion } : {}),
    ...where,
  };
}

export function diagnoseDynamic(item: ScannedExpression): Diagnostic | undefined {
  if (item.context === "code") return undefined;
  return {
    severity: "warning",
    code: "dynamic-expression",
    message: `"${item.text}" is built at runtime, so CROFF cannot see the final class name and no CSS is generated for it.`,
    hint: "Write each complete expression in the source, and choose between them at runtime.",
    ...location(item),
  };
}

export function diagnoseBroken(item: ScannedExpression): Diagnostic {
  if (item.tooLong) {
    return {
      severity: "error",
      code: "expression-too-long",
      message: `"${item.text}" is too long to read as an expression, so no CSS is generated for it.`,
      hint: "Move the long value to a theme token or a CSS variable.",
      ...location(item),
    };
  }
  // Whitespace in `hover:(a(1), b(2))` isn't the real problem, so report the real one.
  const parsed = parse(item.text);
  if (!parsed.ok && parsed.error.code === "unsupported-group") {
    return {
      severity: "error",
      code: parsed.error.code,
      message: formatParseError(parsed.error, item.text),
      expression: item.text,
      ...(parsed.error.hint ? { hint: parsed.error.hint } : {}),
      ...location(item),
    };
  }
  return {
    severity: "error",
    code: "whitespace",
    message: `"${item.text}" contains whitespace inside an expression, so the browser sees separate classes.`,
    hint: "Inside brackets, write spaces as underscores: width[calc(100%_-_1px)].",
    ...location(item),
  };
}

/** Formats one diagnostic for a terminal. */
export function formatDiagnostic(diagnostic: Diagnostic): string {
  const position =
    diagnostic.file !== undefined
      ? `${diagnostic.file}:${(diagnostic.line ?? 0) + 1}:${(diagnostic.column ?? 0) + 1}: `
      : "";
  const lines = [`${position}${diagnostic.severity} ${diagnostic.code}: ${diagnostic.message}`];
  if (diagnostic.hint && !diagnostic.message.includes(diagnostic.hint)) {
    lines.push(`  hint: ${diagnostic.hint}`);
  }
  return lines.join("\n");
}
