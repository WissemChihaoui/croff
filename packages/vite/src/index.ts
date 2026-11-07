import { basename, dirname, relative, resolve } from "node:path";
import { CONFIG_FILES, formatDiagnostic, Project } from "@croffcss/core/node";
import type { Plugin, ResolvedConfig, ViteDevServer } from "vite";

export interface CroffViteOptions {
  /** Path to the config file. Defaults to `croff.config.*` in the Vite root. */
  config?: string;
}

const CSS_FILE = /\.(css|pcss|postcss)(?:$|\?)/;
const HAS_DIRECTIVE = /@croff[\s;]/;
const SYNC_DEBOUNCE_MS = 30;

/**
 * Compiles CROFF utilities in any stylesheet containing `@croff`. During
 * development, those stylesheets hot-reload when the set of utilities used in
 * the content files changes. Editing other things causes no CSS work at all.
 */
export default function croff(options: CroffViteOptions = {}): Plugin {
  let viteConfig: ResolvedConfig;
  let project: Project | undefined;
  let loading: Promise<Project> | undefined;
  let server: ViteDevServer | undefined;
  /** Files of the stylesheets holding a directive. */
  const stylesheets = new Set<string>();
  let reported = new Set<string>();

  const getProject = (): Promise<Project> => {
    if (project) return Promise.resolve(project);
    loading ??= Project.load({
      cwd: viteConfig.root,
      ...(options.config ? { configPath: options.config } : {}),
    }).then(async (loaded) => {
      project = loaded;
      await loaded.scan();
      return loaded;
    });
    return loading;
  };

  /** Whether a path is the config file in use, or one that would be used if it existed. */
  const isConfigFile = (file: string): boolean => {
    const path = resolve(file);
    const root = resolve(viteConfig.root);
    if (options.config) return path === resolve(root, options.config);
    return dirname(path) === root && CONFIG_FILES.includes(basename(path));
  };

  const log = (message: string, isError: boolean) => {
    if (isError) viteConfig.logger.error(`[croff] ${message}`);
    else viteConfig.logger.warn(`[croff] ${message}`);
  };

  /** Prints each diagnostic once, until the project's diagnostics change. */
  const report = (messages: { text: string; isError: boolean }[]) => {
    const next = new Set<string>();
    for (const { text, isError } of messages) {
      next.add(text);
      if (!reported.has(text)) log(text, isError);
    }
    reported = next;
  };

  const reloadStylesheets = async (dev: ViteDevServer) => {
    for (const file of stylesheets) {
      // One file can back several modules, such as "a.css" and "a.css?direct".
      for (const module of dev.moduleGraph.getModulesByFile(file) ?? []) {
        await dev.reloadModule(module);
      }
    }
  };

  let syncTimer: ReturnType<typeof setTimeout> | undefined;
  let syncing = false;
  let syncAgain = false;

  /**
   * Brings the project up to date. Always a full scan, because watchers can
   * coalesce or drop events in a burst of writes, such as a branch switch, and
   * scanning costs only a stat for each unchanged file. Runs one at a time.
   */
  const sync = async (dev: ViteDevServer) => {
    if (syncing) {
      syncAgain = true;
      return;
    }
    syncing = true;
    try {
      do {
        syncAgain = false;
        const loaded = await getProject();
        if ((await loaded.scan()).changed) await reloadStylesheets(dev);
      } while (syncAgain);
    } finally {
      syncing = false;
    }
  };

  return {
    name: "croff",
    enforce: "pre",

    configResolved(resolved) {
      viteConfig = resolved;
      // A dev server restart can reuse this plugin instance, so forget the old config.
      project = undefined;
      loading = undefined;
      reported = new Set();
    },

    configureServer(dev) {
      server = dev;
      const fail = (error: unknown) =>
        log(error instanceof Error ? error.message : String(error), true);

      const scheduleSync = () => {
        clearTimeout(syncTimer);
        syncTimer = setTimeout(() => void sync(dev).catch(fail), SYNC_DEBOUNCE_MS);
      };

      // Handlers attach synchronously, so that no event is missed while the project loads.
      const onFile = (file: string) => {
        if (isConfigFile(file)) {
          clearTimeout(syncTimer);
          dev.restart().catch(fail);
        } else if (!project || project.scanner.matches(file)) {
          scheduleSync();
        }
      };
      dev.watcher.on("add", onFile);
      dev.watcher.on("unlink", onFile);
      dev.watcher.on("change", onFile);

      // Events aren't reported for changes made before the watcher finishes starting up.
      dev.watcher.once("ready", scheduleSync);

      getProject()
        .then((loaded) => {
          // Vite already watches its root, and adding those paths again can disturb the watcher.
          const outsideRoot = (path: string) => relative(viteConfig.root, path).startsWith("..");
          dev.watcher.add(loaded.scanner.watchRoots().filter(outsideRoot));
          if (loaded.configPath && outsideRoot(loaded.configPath)) {
            dev.watcher.add(loaded.configPath);
          }
        })
        .catch(fail);
    },

    async transform(code, id) {
      if (!CSS_FILE.test(id) || !HAS_DIRECTIVE.test(code)) return null;
      const clean = id.split("?")[0]!;
      stylesheets.add(clean);

      const loaded = await getProject();
      // In a build, content files are dependencies for "vite build --watch".
      if (!server) {
        await loaded.scan();
        for (const file of loaded.scanner.filePaths()) this.addWatchFile(file);
        if (loaded.configPath) this.addWatchFile(loaded.configPath);
      }

      const result = await loaded.processCss(code);
      const messages = result.diagnostics.map((diagnostic) => ({
        text: formatDiagnostic(diagnostic),
        isError: diagnostic.severity === "error",
      }));
      for (const error of result.directiveErrors) {
        messages.push({ text: error.message, isError: true });
      }
      report(messages);
      return { code: result.css, map: { mappings: "" } };
    },
  };
}

export { croff };
