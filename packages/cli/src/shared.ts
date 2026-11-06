import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, relative } from "node:path";
import { styleText } from "node:util";
import { formatDiagnostic, type Diagnostic, type Project } from "@croff/core/node";

export interface Output {
  log(message: string): void;
  error(message: string): void;
}

export interface CommandOption {
  name: string;
  short?: string;
  type: "string" | "boolean";
  value?: string;
  description: string;
}

export type Values = Record<string, string | boolean | undefined>;

export interface Command {
  summary: string;
  usage: string;
  description?: string;
  options: CommandOption[];
  run(values: Values, output: Output): Promise<number>;
}

export class UsageError extends Error {
  override name = "UsageError";
}

export const paint = {
  bold: (text: string) => styleText("bold", text),
  dim: (text: string) => styleText("dim", text),
  red: (text: string) => styleText("red", text),
  yellow: (text: string) => styleText("yellow", text),
  green: (text: string) => styleText("green", text),
};

export const COMMON_OPTIONS: CommandOption[] = [
  {
    name: "cwd",
    type: "string",
    value: "dir",
    description: "Project root. Default: current directory",
  },
  {
    name: "config",
    short: "c",
    type: "string",
    value: "file",
    description: "Path to the config file",
  },
];

/** Reads a string option. */
export function stringOption(values: Values, name: string): string | undefined {
  const value = values[name];
  return typeof value === "string" ? value : undefined;
}

/** Prints diagnostics grouped by severity, and returns the error count. */
export function reportDiagnostics(diagnostics: readonly Diagnostic[], output: Output): number {
  let errors = 0;
  for (const diagnostic of diagnostics) {
    if (diagnostic.severity === "error") {
      errors++;
      output.error(paint.red(formatDiagnostic(diagnostic)));
    } else {
      output.error(paint.yellow(formatDiagnostic(diagnostic)));
    }
  }
  return errors;
}

export function formatBytes(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} kB`;
}

export interface OutputPaths {
  input: string | undefined;
  output: string | undefined;
}

export function resolveOutputPaths(project: Project, values: Values): OutputPaths {
  const input = stringOption(values, "input") ?? project.config.input;
  const output = stringOption(values, "output") ?? project.config.output;
  return {
    input: input === undefined ? undefined : project.resolvePath(input),
    output: output === undefined ? undefined : project.resolvePath(output),
  };
}

export async function writeOutput(
  path: string,
  css: string,
  map: object | undefined,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  if (map) {
    await writeFile(`${path}.map`, `${JSON.stringify(map)}\n`);
    await writeFile(path, `${css}\n/*# sourceMappingURL=${basename(path)}.map */\n`);
  } else {
    await writeFile(path, css);
  }
}

/** A path for messages, relative to the project root. */
export function displayPath(project: Project, path: string): string {
  return relative(project.cwd, path).replaceAll("\\", "/");
}
