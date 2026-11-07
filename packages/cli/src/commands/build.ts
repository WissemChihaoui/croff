import { Project } from "@croffcss/core/node";
import { generate } from "../generate.js";
import {
  COMMON_OPTIONS,
  displayPath,
  formatBytes,
  paint,
  reportDiagnostics,
  resolveOutputPaths,
  stringOption,
  UsageError,
  writeOutput,
  type Command,
} from "../shared.js";

export const buildCommand: Command = {
  summary: "Generate production CSS once",
  usage: "[options]",
  description:
    "Scans the content files and writes CSS containing only the utilities in use. Output is deterministic: the same sources always produce the same bytes. Exits non-zero if any error is found.",
  options: [
    ...COMMON_OPTIONS,
    {
      name: "input",
      short: "i",
      type: "string",
      value: "file",
      description: "Stylesheet containing @croff",
    },
    {
      name: "output",
      short: "o",
      type: "string",
      value: "file",
      description: "Where to write CSS",
    },
    { name: "no-minify", type: "boolean", description: "Keep the output readable" },
    { name: "sourcemap", type: "boolean", description: "Write a source map" },
  ],
  async run(values, output) {
    const cwd = stringOption(values, "cwd");
    const config = stringOption(values, "config");
    const project = await Project.load({
      ...(cwd ? { cwd } : {}),
      ...(config ? { configPath: config } : {}),
    });
    const paths = resolveOutputPaths(project, values);
    if (!paths.output) {
      throw new UsageError('No output file. Use --output or set "output" in croff.config.');
    }

    const started = performance.now();
    const scan = await project.scan();
    const result = await generate(project, {
      input: paths.input,
      output: paths.output,
      minify: !values["no-minify"],
      sourceMap: values["sourcemap"] === true,
    });

    const errors = reportDiagnostics(result.diagnostics, output);
    if (errors > 0) {
      output.error(
        paint.red(
          `\nBuild failed with ${errors} error${errors === 1 ? "" : "s"}. Nothing was written.`,
        ),
      );
      return 1;
    }

    await writeOutput(paths.output, result.css, result.map);
    const elapsed = Math.round(performance.now() - started);
    output.log(
      `${paint.green("✓")} ${displayPath(project, paths.output)}  ${formatBytes(Buffer.byteLength(result.css))}  ` +
        paint.dim(`${result.rules} rules from ${scan.files} files in ${elapsed} ms`),
    );
    if (scan.files === 0) {
      output.error(
        paint.yellow(
          `No files matched the content patterns: ${project.scanner.content.join(", ")}`,
        ),
      );
    }
    return 0;
  },
};
