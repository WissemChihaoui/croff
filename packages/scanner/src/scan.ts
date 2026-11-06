import { readFile, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import picomatch from "picomatch";
import { glob } from "tinyglobby";
import {
  extractCandidates,
  type Candidate,
  type DynamicExpression,
  type ExtractOptions,
} from "./extract.js";

export const DEFAULT_CONTENT = [
  "src/**/*.{html,js,jsx,ts,tsx,mjs,cjs,vue,svelte,astro,md,mdx}",
  "index.html",
];

/** Always excluded, on top of any configured `ignore` patterns. */
export const DEFAULT_IGNORE = [
  "**/node_modules/**",
  "**/dist/**",
  "**/.git/**",
  "**/.vite/**",
  "**/*.min.*",
];

export interface ScannerOptions extends ExtractOptions {
  /** The project root. Patterns are relative to it. */
  cwd: string;
  /** Glob patterns of files to scan. */
  content?: string[];
  /** Extra glob patterns to exclude. */
  ignore?: string[];
}

/** One expression's aggregate state across files. */
export interface ScannedCandidate extends Candidate {
  /** The file of the first occurrence, relative to the root, using `/`. */
  file: string;
}

export interface ScannedExpression extends DynamicExpression {
  file: string;
}

export interface ScanResult {
  /** Sorted by file path then position, so aggregate output is stable. */
  candidates: ScannedCandidate[];
  dynamic: ScannedExpression[];
  broken: ScannedExpression[];
  /** How many files were scanned in total. */
  files: number;
  /** How many of them had to be read during this call. */
  filesRead: number;
  /** True if the set of candidate expressions changed since the previous scan. */
  changed: boolean;
}

interface FileEntry {
  mtimeMs: number;
  size: number;
  /** Whether an edit made after this read is certain to change the timestamp. */
  settled: boolean;
  candidates: Candidate[];
  dynamic: DynamicExpression[];
  broken: DynamicExpression[];
}

/**
 * How old a timestamp must be before an unchanged one proves that a file is unchanged. A same-size
 * edit within one timestamp tick looks identical, and the coarsest common filesystem ticks every
 * two seconds.
 */
const TIMESTAMP_SETTLE_MS = 2000;

const toPosix = (path: string) => (sep === "\\" ? path.replaceAll("\\", "/") : path);

export class Scanner {
  readonly cwd: string;
  readonly content: string[];
  readonly ignore: string[];
  private readonly extractOptions: ExtractOptions;
  private readonly isMatch: (path: string) => boolean;
  private readonly files = new Map<string, FileEntry>();
  private lastSignature: string | undefined;
  private filesRead = 0;

  constructor(options: ScannerOptions) {
    this.cwd = resolve(options.cwd);
    this.content = options.content ?? DEFAULT_CONTENT;
    this.ignore = [...DEFAULT_IGNORE, ...(options.ignore ?? [])];
    this.extractOptions = options.classFunctions ? { classFunctions: options.classFunctions } : {};
    const included = picomatch(this.content, { dot: true });
    const excluded = picomatch(this.ignore, { dot: true });
    this.isMatch = (path) => included(path) && !excluded(path);
  }

  private relativePath(path: string): string {
    return toPosix(isAbsolute(path) ? relative(this.cwd, path) : path);
  }

  /** Whether a path is selected by the content and ignore patterns. */
  matches(path: string): boolean {
    const rel = this.relativePath(path);
    return !rel.startsWith("../") && this.isMatch(rel);
  }

  /**
   * Scans the project. Files whose size and modification time are unchanged are not read
   * again, unless they were modified too recently for that to be conclusive. Files that
   * disappeared are forgotten.
   */
  async scan(): Promise<ScanResult> {
    const paths = await glob(this.content, {
      cwd: this.cwd,
      ignore: this.ignore,
      dot: true,
      onlyFiles: true,
      expandDirectories: false,
    });
    const current = new Set(paths.map(toPosix));
    for (const known of this.files.keys()) {
      if (!current.has(known)) this.files.delete(known);
    }
    await Promise.all([...current].map((path) => this.refresh(path)));
    return this.result();
  }

  /** Reads a single file again after a change, an addition or a removal. */
  async update(path: string): Promise<ScanResult> {
    const rel = this.relativePath(path);
    if (this.matches(rel)) await this.refresh(rel, true);
    return this.result();
  }

  private async refresh(rel: string, force = false): Promise<void> {
    const absolute = resolve(this.cwd, rel);
    try {
      const info = await stat(absolute);
      const known = this.files.get(rel);
      const unchanged =
        known?.settled && known.mtimeMs === info.mtimeMs && known.size === info.size;
      if (unchanged && !force) return;
      const settled = Date.now() - info.mtimeMs > TIMESTAMP_SETTLE_MS;
      const source = await readFile(absolute, "utf8");
      this.filesRead++;
      this.files.set(rel, {
        mtimeMs: info.mtimeMs,
        size: info.size,
        settled,
        ...extractCandidates(source, this.extractOptions),
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      // The file vanished between listing and reading: treat it as removed.
      this.files.delete(rel);
    }
  }

  private result(): ScanResult {
    const merged = new Map<string, ScannedCandidate>();
    const dynamic: ScannedExpression[] = [];
    const broken: ScannedExpression[] = [];
    const paths = [...this.files.keys()].sort();
    const rank = { code: 0, string: 1, class: 2 };

    for (const file of paths) {
      const entry = this.files.get(file)!;
      for (const candidate of entry.candidates) {
        const existing = merged.get(candidate.expression);
        if (!existing) {
          merged.set(candidate.expression, { ...candidate, file });
        } else if (rank[candidate.context] > rank[existing.context]) {
          // The most specific context decides how failures are reported.
          existing.context = candidate.context;
        }
      }
      for (const item of entry.dynamic) dynamic.push({ ...item, file });
      for (const item of entry.broken) broken.push({ ...item, file });
    }

    const candidates = [...merged.values()];
    const signature = candidates
      .map((c) => c.expression)
      .sort()
      .join("\n");
    const changed = signature !== this.lastSignature;
    this.lastSignature = signature;
    const filesRead = this.filesRead;
    this.filesRead = 0;
    return { candidates, dynamic, broken, files: this.files.size, filesRead, changed };
  }

  /** Absolute paths of every file seen by the latest scan. */
  filePaths(): string[] {
    return [...this.files.keys()].map((rel) => resolve(this.cwd, rel));
  }

  /** Directories to watch: the static prefix of each content pattern. */
  watchRoots(): string[] {
    const roots = new Set<string>();
    for (const pattern of this.content) {
      const parts = pattern.split("/");
      const staticParts: string[] = [];
      for (const part of parts.slice(0, -1)) {
        if (/[*?{}[\]()!]/.test(part)) break;
        staticParts.push(part);
      }
      roots.add(resolve(this.cwd, staticParts.join("/")));
    }
    return [...roots].sort();
  }
}
