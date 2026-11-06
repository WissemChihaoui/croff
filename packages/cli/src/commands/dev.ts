import { watch as watchFile, type FSWatcher } from "node:fs";
import { Project } from "@croff/core/node";
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
  type Output,
  type Values,
} from "../shared.js";

interface DevContext {
  project: Project;
  values: Values;
  output: Output;
}

async function rebuild({ project, values, output }: DevContext, reason: string): Promise<void> {
  const paths = resolveOutputPaths(project, values);
  const started = performance.now();
  const result = await generate(project, {
    input: paths.input,
    output: paths.output,
    minify: false,
    sourceMap: values["sourcemap"] === true,
  });
  // Errors don't stop the watcher, and don't discard the rest of the output.
  reportDiagnostics(result.diagnostics, output);
  await writeOutput(paths.output!, result.css, result.map);
  const elapsed = Math.round(performance.now() - started);
  output.log(
    `${paint.green("✓")} ${paint.dim(reason)} ${displayPath(project, paths.output!)}  ` +
      `${formatBytes(Buffer.byteLength(result.css))}  ${paint.dim(`${result.rules} rules in ${elapsed} ms`)}`,
  );
}

export const devCommand: Command = {
  summary: "Watch source files and regenerate CSS as they change",
  usage: "[options]",
  description:
    "Builds once, then rebuilds whenever the set of utilities in your content files changes, or the config or input stylesheet is edited. Problems are reported but don't stop the watcher. Press Ctrl+C to stop.",
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
    { name: "sourcemap", type: "boolean", description: "Write a source map" },
    { name: "once", type: "boolean", description: "Build once and exit, without watching" },
  ],
  async run(values, output) {
    const cwd = stringOption(values, "cwd");
    const config = stringOption(values, "config");
    const load = () =>
      Project.load({
        ...(cwd ? { cwd } : {}),
        ...(config ? { configPath: config } : {}),
      });

    let project = await load();
    const paths = resolveOutputPaths(project, values);
    if (!paths.output) {
      throw new UsageError('No output file. Use --output or set "output" in croff.config.');
    }

    const context = () => ({ project, values, output });
    await project.scan();
    await rebuild(context(), "built");
    if (values["once"]) return 0;

    output.log(
      paint.dim(
        `Watching ${project.scanner
          .watchRoots()
          .map((root) => displayPath(project, root) || ".")
          .join(", ")}`,
      ),
    );

    const report = (error: unknown) =>
      output.error(paint.red(error instanceof Error ? error.message : String(error)));

    let content = project.watch(() => {
      rebuild(context(), "updated").catch(report);
    }, report);

    const fileWatchers: FSWatcher[] = [];
    if (project.configPath) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      fileWatchers.push(
        watchFile(project.configPath, () => {
          clearTimeout(timer);
          timer = setTimeout(() => {
            load()
              .then(async (next) => {
                content.close();
                project = next;
                await project.scan();
                content = project.watch(() => {
                  rebuild(context(), "updated").catch(report);
                }, report);
                await rebuild(context(), "config changed");
              })
              .catch(report);
          }, 50);
        }),
      );
    }
    if (paths.input) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      fileWatchers.push(
        watchFile(paths.input, () => {
          clearTimeout(timer);
          timer = setTimeout(() => rebuild(context(), "stylesheet changed").catch(report), 50);
        }),
      );
    }

    return await new Promise<number>((resolve) => {
      const stop = () => {
        content.close();
        for (const watcher of fileWatchers) watcher.close();
        resolve(0);
      };
      process.once("SIGINT", stop);
      process.once("SIGTERM", stop);
    });
  },
};
