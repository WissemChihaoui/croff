import { watch as watchDirectory, type FSWatcher } from "node:fs";
import { relative, resolve } from "node:path";
import type { ScanResult, Scanner } from "./scan.js";

export interface WatchOptions {
  /** Quiet period before a batch of file events is processed. */
  debounceMs?: number;
  /** Called after every batch that changed the set of expressions. */
  onChange: (result: ScanResult, changedFiles: string[]) => void;
  /** Called when a rescan fails. */
  onError?: (error: unknown) => void;
}

export interface WatchHandle {
  close(): void;
}

/**
 * Watches the scanner's content roots using the platform's recursive file
 * watching. Events are batched, so that editors which save in several steps
 * cause one rebuild, and only matching files are rescanned.
 */
export function watchFiles(scanner: Scanner, options: WatchOptions): WatchHandle {
  const { debounceMs = 50, onChange, onError } = options;
  const pending = new Set<string>();
  const watchers: FSWatcher[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;
  let scanning = false;
  let scanAgain = false;

  const flush = async () => {
    // Scans never overlap. Events during one are picked up by another straight after.
    if (scanning) {
      scanAgain = true;
      return;
    }
    scanning = true;
    const files = [...pending];
    pending.clear();
    try {
      // A full scan handles additions and removals. Unchanged files aren't re-read.
      const result = await scanner.scan();
      if (!closed && result.changed) {
        onChange(
          result,
          files.map((file) => relative(scanner.cwd, file)),
        );
      }
    } catch (error) {
      onError?.(error);
    } finally {
      scanning = false;
      if (scanAgain && !closed) {
        scanAgain = false;
        void flush();
      }
    }
  };

  for (const root of scanner.watchRoots()) {
    try {
      const watcher = watchDirectory(root, { recursive: true }, (_event, filename) => {
        if (!filename) return;
        const absolute = resolve(root, filename.toString());
        if (!scanner.matches(absolute)) return;
        pending.add(absolute);
        clearTimeout(timer);
        timer = setTimeout(() => void flush(), debounceMs);
      });
      watcher.on("error", (error) => onError?.(error));
      watchers.push(watcher);
    } catch (error) {
      // A content root may not exist yet. It is not an error for a pattern to match nothing.
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") onError?.(error);
    }
  }

  // An edit between the caller's last scan and the watchers starting raises no event, so
  // rescan once now. Unchanged files aren't re-read, and nothing is reported if nothing changed.
  timer = setTimeout(() => void flush(), debounceMs);

  return {
    close() {
      closed = true;
      clearTimeout(timer);
      for (const watcher of watchers) watcher.close();
    },
  };
}
