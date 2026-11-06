import { createCroff, type CompileFailure, type CroffConfig, type ThemeIssue } from "@croff/core";
import { extractCandidates } from "@croff/scanner/extract";

export interface LiveProblem {
  severity: "error" | "warning";
  message: string;
  hint?: string;
  expression?: string;
}

export interface LiveResult {
  css: string;
  /** The CSS without the reset, for showing to people. */
  displayCss: string;
  problems: LiveProblem[];
  ruleCount: number;
  themeIssues: ThemeIssue[];
}

function describeFailure(failure: CompileFailure): LiveProblem {
  return {
    severity: "error",
    message: failure.error.message,
    expression: failure.expression,
    ...(failure.error.hint ? { hint: failure.error.hint } : {}),
  };
}

/**
 * Compiles markup in the browser, through the same pipeline as a build: extract
 * candidates with the scanner, then compile them with the real engine.
 */
export function compileMarkup(markup: string, config: CroffConfig = {}): LiveResult {
  const croff = createCroff(config, { strict: false });
  const { candidates, dynamic, broken } = extractCandidates(markup);
  const compiled = croff.compile(candidates.map((candidate) => candidate.expression));
  const byExpression = new Map(candidates.map((candidate) => [candidate.expression, candidate]));

  const problems: LiveProblem[] = compiled.failures
    .filter((failure) => {
      const written = failure.phase === "resolve" ? failure.group?.expression : undefined;
      return byExpression.get(written ?? failure.expression)?.context === "class";
    })
    .map(describeFailure);
  for (const item of broken) {
    problems.push({
      severity: "error",
      message: `"${item.text}" contains whitespace inside an expression.`,
      hint: "Inside brackets, write spaces as underscores.",
    });
  }
  for (const item of dynamic) {
    problems.push({
      severity: "warning",
      message: `"${item.text}" is built at runtime, so no CSS is generated for it.`,
    });
  }

  const inputs = candidates.map((candidate) => candidate.expression);
  return {
    css: croff.compile(inputs, { layers: ["reset", "theme", "utilities"] }).css,
    displayCss: compiled.css,
    problems,
    ruleCount: compiled.rules.length,
    themeIssues: croff.issues,
  };
}
