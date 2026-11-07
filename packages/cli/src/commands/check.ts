import { readFile } from "node:fs/promises";
import { createCroff, findDirectives } from "@croffcss/core";
import { loadConfig, Project, type Diagnostic } from "@croffcss/core/node";
import {
  COMMON_OPTIONS,
  paint,
  reportDiagnostics,
  resolveOutputPaths,
  stringOption,
  type Command,
} from "../shared.js";

export const checkCommand: Command = {
  summary: "Validate configuration and utility syntax",
  usage: "[options]",
  description:
    "Checks the config file and theme tokens, then checks every expression found in your content files. Reports unknown utilities, invalid values, whitespace inside expressions and class names built at runtime. Exits non-zero if any error is found.",
  options: [
    ...COMMON_OPTIONS,
    { name: "strict", type: "boolean", description: "Treat warnings as errors" },
    { name: "json", type: "boolean", description: "Print diagnostics as JSON" },
  ],
  async run(values, output) {
    const cwd = stringOption(values, "cwd") ?? process.cwd();
    const configPath = stringOption(values, "config");

    const { config, path } = await loadConfig(cwd, configPath);
    const themeIssues = createCroff(config, { strict: false }).issues;
    const diagnostics: Diagnostic[] = themeIssues.map((issue) => ({
      severity: "error",
      code: issue.code,
      message: issue.message,
      ...(path ? { file: path } : {}),
    }));

    let summary = { files: 0, expressions: 0, valid: 0 };
    // Expressions can only be judged against a valid theme.
    if (themeIssues.length === 0) {
      const project = await Project.load({ cwd, ...(configPath ? { configPath } : {}) });
      const scan = await project.scan();
      const result = await project.generate({ layers: [] });
      diagnostics.push(...result.diagnostics);
      summary = {
        files: scan.files,
        expressions: scan.candidates.length,
        valid: result.rules.length,
      };

      if (scan.files === 0) {
        diagnostics.push({
          severity: "warning",
          code: "no-files",
          message: `No files matched the content patterns: ${project.scanner.content.join(", ")}`,
        });
      }

      const { input } = resolveOutputPaths(project, values);
      if (input) {
        try {
          const css = await readFile(input, "utf8");
          if (findDirectives(css).length === 0) {
            diagnostics.push({
              severity: "warning",
              code: "no-directive",
              message: `${input} has no @croff directive.`,
            });
          }
        } catch {
          diagnostics.push({
            severity: "error",
            code: "missing-input",
            message: `The input stylesheet does not exist: ${input}`,
          });
        }
      }
    }

    if (values["json"]) {
      output.log(JSON.stringify({ config: path ?? null, ...summary, diagnostics }, null, 2));
    } else {
      reportDiagnostics(diagnostics, output);
    }

    const errors = diagnostics.filter((d) => d.severity === "error").length;
    const warnings = diagnostics.length - errors;
    const failed = errors > 0 || (values["strict"] === true && warnings > 0);

    if (!values["json"]) {
      const counts = `${errors} error${errors === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}`;
      const scope = `${summary.valid} utilities in ${summary.files} files`;
      const mark = failed ? paint.red("✗") : paint.green("✓");
      output.log(`${diagnostics.length > 0 ? "\n" : ""}${mark} ${counts}  ${paint.dim(scope)}`);
    }
    return failed ? 1 : 0;
  },
};
