import { statSync } from "node:fs";
import { resolve } from "node:path";
import { findConfigFile, formatDiagnostic, Project } from "@croffcss/core/node";
import type { AtRule, PluginCreator } from "postcss";

export interface CroffPostcssOptions {
  /** Project root. Defaults to the directory PostCSS runs in. */
  cwd?: string;
  /** Path to the config file. Defaults to `croff.config.*` in the root. */
  config?: string;
}

const LAYERS: Record<string, "reset" | "theme" | "utilities" | "default"> = {
  "": "default",
  reset: "reset",
  theme: "theme",
  utilities: "utilities",
};

/** Keeps a project between runs, so that watch mode only re-reads changed files. */
const projects = new Map<string, { stamp: string; project: Promise<Project> }>();

/** Identifies the current state of the config file. */
function configStamp(cwd: string, config: string | undefined): string {
  const path = config ? resolve(cwd, config) : findConfigFile(cwd);
  if (!path) return "";
  try {
    const { mtimeMs, size } = statSync(path);
    return `${path}:${mtimeMs}:${size}`;
  } catch {
    return path;
  }
}

function getProject(cwd: string, config: string | undefined): Promise<Project> {
  const key = `${cwd}\0${config ?? ""}`;
  const stamp = configStamp(cwd, config);
  const existing = projects.get(key);
  if (existing?.stamp === stamp) return existing.project;

  const project = Project.load({ cwd, ...(config ? { configPath: config } : {}) });
  project.catch(() => projects.delete(key));
  projects.set(key, { stamp, project });
  return project;
}

/** Replaces `@croff` at-rules with the generated CSS. */
const croff: PluginCreator<CroffPostcssOptions> = (options = {}) => ({
  postcssPlugin: "@croffcss/postcss",
  async Once(root, { result, postcss }) {
    const directives: AtRule[] = [];
    root.walkAtRules("croff", (rule) => {
      directives.push(rule);
    });
    if (directives.length === 0) return;

    const cwd = resolve(options.cwd ?? process.cwd());
    const project = await getProject(cwd, options.config);
    await project.scan();

    // Tell the host what this stylesheet depends on, so that it rebuilds in watch mode.
    const from = result.opts.from;
    for (const pattern of project.scanner.content) {
      const staticPart = pattern.split("/").filter((part, index, parts) => {
        return index < parts.length - 1 && !/[*?{}[\]()!]/.test(part);
      });
      const glob = pattern.slice(staticPart.join("/").length).replace(/^\//, "");
      result.messages.push({
        type: "dir-dependency",
        plugin: "@croffcss/postcss",
        dir: resolve(cwd, staticPart.join("/")),
        glob,
        ...(from ? { parent: from } : {}),
      });
    }
    if (project.configPath) {
      result.messages.push({
        type: "dependency",
        plugin: "@croffcss/postcss",
        file: project.configPath,
        ...(from ? { parent: from } : {}),
      });
    }

    for (const directive of directives) {
      const kind = Object.hasOwn(LAYERS, directive.params) ? LAYERS[directive.params] : undefined;
      if (!kind) {
        throw directive.error(
          `Unknown directive "@croff ${directive.params};". Use @croff; or @croff reset; or @croff theme; or @croff utilities;.`,
        );
      }
      const generated = await project.generate({
        layers: kind === "default" ? ["theme", "utilities"] : [kind],
      });
      const parsed = postcss.parse(generated.css, { from: directive.source?.input.file ?? from });
      parsed.walk((node) => {
        node.source = directive.source;
      });
      directive.replaceWith(parsed.nodes);
    }

    const { diagnostics } = await project.generate({ layers: [] });
    for (const diagnostic of diagnostics) {
      result.warn(formatDiagnostic(diagnostic), { plugin: "@croffcss/postcss" });
    }
  },
});

croff.postcss = true;

export default croff;
export { croff };
