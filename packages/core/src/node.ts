import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { Scanner, watchFiles, type ScanResult, type WatchHandle } from "@croffcss/scanner";
import { createJiti } from "jiti";
import {
  createCroff,
  type CompileFailure,
  type CompileInput,
  type CompileOptions,
  type CompileResult,
  type Croff,
  type CroffConfig,
  type ProcessCssOptions,
  type ProcessCssResult,
} from "./index.js";
import {
  diagnoseBroken,
  diagnoseDynamic,
  diagnoseFailure,
  formatDiagnostic,
  type Diagnostic,
  type DiagnosticSeverity,
} from "./diagnostics.js";

export { formatDiagnostic, type Diagnostic, type DiagnosticSeverity };

export const CONFIG_FILES = [
  "croff.config.ts",
  "croff.config.mts",
  "croff.config.js",
  "croff.config.mjs",
];

/** Finds the configuration file in a directory, or `undefined`. */
export function findConfigFile(cwd: string): string | undefined {
  for (const name of CONFIG_FILES) {
    const path = resolve(cwd, name);
    if (existsSync(path)) return path;
  }
  return undefined;
}

export interface LoadedConfig {
  config: CroffConfig;
  /** The absolute path of the file it came from, if any. */
  path?: string;
}

export class ConfigLoadError extends Error {
  override name = "ConfigLoadError";
}

/** Loads the configuration file. A missing file means the defaults. */
export async function loadConfig(cwd: string, configPath?: string): Promise<LoadedConfig> {
  const path = configPath ? resolve(cwd, configPath) : findConfigFile(cwd);
  if (!path) return { config: {} };
  if (!existsSync(path)) throw new ConfigLoadError(`Config file not found: ${path}`);

  // Evaluating the file's text, rather than importing its path, sidesteps module
  // caches, so that a watcher sees edits to the config.
  const jiti = createJiti(path, { moduleCache: false, fsCache: false, tryNative: false });
  let loaded: unknown;
  try {
    const module = (await jiti.evalModule(await readFile(path, "utf8"), {
      filename: path,
      async: true,
      forceTranspile: true,
    })) as { default?: unknown };
    loaded = module.default;
  } catch (error) {
    throw new ConfigLoadError(
      `Could not load ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (typeof loaded !== "object" || loaded === null || Array.isArray(loaded)) {
    throw new ConfigLoadError(`${path} must export a configuration object as its default export.`);
  }
  return { config: loaded as CroffConfig, path };
}

export interface ProjectOptions {
  /** The project root. Defaults to the current directory. */
  cwd?: string;
  /** An explicit path to a configuration file. */
  configPath?: string;
  /** Configuration overriding what the file says. */
  overrides?: CroffConfig;
}

export interface GenerateResult extends CompileResult {
  diagnostics: Diagnostic[];
}

/**
 * One project on disk: configuration, engine and scanner together. Integrations
 * are built on this.
 *
 * @unstable This class may change between 0.x releases.
 */
export class Project {
  readonly engine: Croff;
  readonly scanner: Scanner;
  private latest: ScanResult | undefined;

  private constructor(
    readonly cwd: string,
    readonly config: CroffConfig,
    readonly configPath: string | undefined,
  ) {
    this.engine = createCroff(config);
    this.scanner = new Scanner({
      cwd,
      ...(config.content ? { content: config.content } : {}),
      ...(config.ignore ? { ignore: config.ignore } : {}),
      ...(config.classFunctions ? { classFunctions: config.classFunctions } : {}),
    });
  }

  static async load(options: ProjectOptions = {}): Promise<Project> {
    const cwd = resolve(options.cwd ?? process.cwd());
    const { config, path } = await loadConfig(cwd, options.configPath);
    return new Project(cwd, { ...config, ...options.overrides }, path);
  }

  /** Scans for changes. Only files that changed on disk are read. */
  async scan(): Promise<ScanResult> {
    this.latest = await this.scanner.scan();
    return this.latest;
  }

  /** Updates after one file changed, was added or was removed. */
  async updateFile(path: string): Promise<ScanResult> {
    this.latest = await this.scanner.update(path);
    return this.latest;
  }

  private async current(): Promise<ScanResult> {
    return this.latest ?? (await this.scan());
  }

  private inputs(scan: ScanResult): CompileInput[] {
    return scan.candidates.map(({ expression, file, line, column }) => ({
      expression,
      location: { file, line, column },
    }));
  }

  private diagnose(scan: ScanResult, failures: readonly CompileFailure[]): Diagnostic[] {
    const byExpression = new Map(scan.candidates.map((c) => [c.expression, c]));
    const diagnostics: Diagnostic[] = [];
    for (const failure of failures) {
      const diagnostic = diagnoseFailure(failure, byExpression.get(failure.expression));
      if (diagnostic) diagnostics.push(diagnostic);
    }
    for (const item of scan.dynamic) {
      const diagnostic = diagnoseDynamic(item);
      if (diagnostic) diagnostics.push(diagnostic);
    }
    for (const item of scan.broken) diagnostics.push(diagnoseBroken(item));
    return diagnostics.sort(
      (a, b) =>
        (a.file ?? "").localeCompare(b.file ?? "") ||
        (a.line ?? 0) - (b.line ?? 0) ||
        (a.column ?? 0) - (b.column ?? 0),
    );
  }

  /** Generates CSS for everything found so far, scanning first if needed. */
  async generate(options: CompileOptions = {}): Promise<GenerateResult> {
    const scan = await this.current();
    const result = this.engine.compile(this.inputs(scan), options);
    return { ...result, diagnostics: this.diagnose(scan, result.failures) };
  }

  /** Replaces `@croff` directives in a stylesheet. */
  async processCss(
    css: string,
    options: ProcessCssOptions = {},
  ): Promise<ProcessCssResult & { diagnostics: Diagnostic[] }> {
    const scan = await this.current();
    const result = this.engine.processCss(css, this.inputs(scan), options);
    return { ...result, diagnostics: this.diagnose(scan, result.failures) };
  }

  /** Watches content files. `onChange` fires only if the set of expressions changed. */
  watch(onChange: (scan: ScanResult) => void, onError?: (error: unknown) => void): WatchHandle {
    return watchFiles(this.scanner, {
      onChange: (scan) => {
        this.latest = scan;
        onChange(scan);
      },
      ...(onError ? { onError } : {}),
    });
  }

  /** Resolves a path from the configuration against the project root. */
  resolvePath(path: string): string {
    return isAbsolute(path) ? path : resolve(this.cwd, path);
  }

  /** The directory holding the configuration file, or the root. */
  get configDirectory(): string {
    return this.configPath ? dirname(this.configPath) : this.cwd;
  }
}
