import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { findConfigFile } from "@croffcss/core/node";
import { paint, stringOption, UsageError, type Command } from "../shared.js";

export type Integration = "vite" | "postcss" | "cli";

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  type?: string;
}

interface Detected {
  packageJson: PackageJson | undefined;
  typescript: boolean;
  framework: string | undefined;
  integration: Integration;
  viteConfig: string | undefined;
  postcssConfig: string | undefined;
  sourceDir: string;
}

const VITE_CONFIGS = ["vite.config.ts", "vite.config.mts", "vite.config.js", "vite.config.mjs"];
const POSTCSS_CONFIGS = [
  "postcss.config.js",
  "postcss.config.mjs",
  "postcss.config.cjs",
  ".postcssrc.json",
  ".postcssrc",
];

async function readPackageJson(cwd: string): Promise<PackageJson | undefined> {
  try {
    return JSON.parse(await readFile(join(cwd, "package.json"), "utf8")) as PackageJson;
  } catch {
    return undefined;
  }
}

export async function detectProject(cwd: string): Promise<Detected> {
  const packageJson = await readPackageJson(cwd);
  const dependencies = { ...packageJson?.dependencies, ...packageJson?.devDependencies };
  const has = (name: string) => Object.hasOwn(dependencies, name);

  const viteConfig = VITE_CONFIGS.find((name) => existsSync(join(cwd, name)));
  const postcssConfig = POSTCSS_CONFIGS.find((name) => existsSync(join(cwd, name)));
  const framework = ["react", "vue", "svelte", "solid-js", "preact", "astro", "next"].find(has);

  let integration: Integration = "cli";
  if (viteConfig || has("vite")) integration = "vite";
  else if (postcssConfig || has("next")) integration = "postcss";

  return {
    packageJson,
    typescript: has("typescript") || existsSync(join(cwd, "tsconfig.json")),
    framework,
    integration,
    viteConfig,
    postcssConfig,
    sourceDir: existsSync(join(cwd, "src")) ? "src" : ".",
  };
}

function contentPatterns(detected: Detected): string[] {
  if (detected.sourceDir === "src") {
    const patterns = ["src/**/*.{html,js,jsx,ts,tsx,vue,svelte,astro,md,mdx}"];
    return detected.integration === "vite" ? [...patterns, "index.html"] : [...patterns, "*.html"];
  }
  return ["*.html", "**/*.{html,js,jsx,ts,tsx}"];
}

export function configTemplate(detected: Detected, stylesheet: string): string {
  const content = contentPatterns(detected)
    .map((pattern) => `"${pattern}"`)
    .join(", ");
  const cliOptions =
    detected.integration === "cli"
      ? `\n  input: "${stylesheet}",\n  output: "dist/croff.css",`
      : "";
  return `import { defineConfig } from "@croffcss/core";

export default defineConfig({
  content: [${content}],${cliOptions}
  theme: {
    colors: {
      // Your tokens are merged over the default theme.
      // brand: "#c8fd12",
    },
  },
});
`;
}

export const STYLESHEET = `@croff reset;
@croff;
`;

/** Adds the plugin to a Vite config. Returns `undefined` if the file's shape isn't recognized. */
export function patchViteConfig(source: string): string | undefined {
  if (source.includes("@croffcss/vite")) return source;
  const plugins = /plugins\s*:\s*\[/.exec(source);
  if (!plugins) return undefined;
  const insertAt = plugins.index + plugins[0].length;
  const empty = /^\s*\]/.test(source.slice(insertAt));
  const patched = `${source.slice(0, insertAt)}${empty ? "croff()" : "croff(), "}${source.slice(insertAt)}`;
  const lastImport = [...patched.matchAll(/^import .*$/gm)].at(-1);
  const line = `import croff from "@croffcss/vite";\n`;
  if (!lastImport) return line + patched;
  const end = lastImport.index + lastImport[0].length + 1;
  return patched.slice(0, end) + line + patched.slice(end);
}

export const initCommand: Command = {
  summary: "Set up CROFF in the current project",
  usage: "[options]",
  description:
    "Detects your project, then creates croff.config and a stylesheet, and wires up the integration: the Vite plugin, the PostCSS plugin or the standalone CLI. It never overwrites a file, and prints everything it did and what is left for you to do.",
  options: [
    {
      name: "cwd",
      type: "string",
      value: "dir",
      description: "Project root. Default: current directory",
    },
    {
      name: "integration",
      type: "string",
      value: "name",
      description: "Force vite, postcss or cli",
    },
    { name: "dry-run", type: "boolean", description: "Print what would happen without writing" },
  ],
  async run(values, output) {
    const cwd = resolve(stringOption(values, "cwd") ?? process.cwd());
    const dryRun = values["dry-run"] === true;
    const detected = await detectProject(cwd);

    const forced = stringOption(values, "integration");
    if (forced !== undefined) {
      if (forced !== "vite" && forced !== "postcss" && forced !== "cli") {
        throw new UsageError(`Unknown integration "${forced}". Use vite, postcss or cli.`);
      }
      detected.integration = forced;
    }

    const parts = [detected.framework, detected.typescript ? "TypeScript" : undefined].filter(
      Boolean,
    );
    output.log(
      `Detected ${paint.bold(detected.integration === "cli" ? "no build tool" : detected.integration)}` +
        `${parts.length ? ` with ${parts.join(" and ")}` : ""}.`,
    );

    const created: string[] = [];
    const updated: string[] = [];
    const skipped: string[] = [];
    const next: string[] = [];

    const create = async (path: string, content: string) => {
      const absolute = join(cwd, path);
      if (existsSync(absolute)) {
        skipped.push(path);
        return;
      }
      if (!dryRun) {
        await mkdir(dirname(absolute), { recursive: true });
        await writeFile(absolute, content);
      }
      created.push(path);
    };

    const stylesheet = detected.sourceDir === "src" ? "src/croff.css" : "croff.css";

    const existingConfig = findConfigFile(cwd);
    if (existingConfig) {
      skipped.push(relative(cwd, existingConfig));
    } else {
      const extension = detected.typescript ? "ts" : "mjs";
      await create(`croff.config.${extension}`, configTemplate(detected, stylesheet));
    }
    await create(stylesheet, STYLESHEET);

    const packages = ["@croffcss/core"];

    if (detected.integration === "vite") {
      packages.push("@croffcss/vite");
      let patched = false;
      if (detected.viteConfig) {
        const path = join(cwd, detected.viteConfig);
        const source = await readFile(path, "utf8");
        const result = patchViteConfig(source);
        if (result !== undefined) {
          patched = true;
          if (result !== source) {
            if (!dryRun) await writeFile(path, result);
            updated.push(`${detected.viteConfig} (added the plugin)`);
          }
        }
      }
      if (!patched) {
        next.push(
          `Add the plugin to your Vite config:\n      import croff from "@croffcss/vite";\n      plugins: [croff()]`,
        );
      }
      next.push(`Import the stylesheet from your entry file: import "./croff.css";`);
    } else if (detected.integration === "postcss") {
      packages.push("@croffcss/postcss");
      if (!detected.postcssConfig) {
        await create(
          "postcss.config.mjs",
          `export default {\n  plugins: { "@croffcss/postcss": {} },\n};\n`,
        );
      } else {
        next.push(`Add "@croffcss/postcss" to the plugins in ${detected.postcssConfig}.`);
      }
      next.push(`Import ${stylesheet} from your entry file or layout.`);
    } else {
      packages.push("@croffcss/cli");
      next.push(`Run "croff dev" while developing and "croff build" for production.`);
      next.push(`Link dist/croff.css from your HTML.`);
    }

    const installed = {
      ...detected.packageJson?.dependencies,
      ...detected.packageJson?.devDependencies,
    };
    const missing = packages.filter((name) => !Object.hasOwn(installed, name));
    if (missing.length > 0) next.unshift(`Install the packages: ${missing.join(" ")}`);

    const verb = dryRun ? "Would create" : "Created";
    const updateVerb = dryRun ? "Would update" : "Updated";
    for (const path of created) output.log(`  ${paint.green("+")} ${verb} ${path}`);
    for (const path of updated) output.log(`  ${paint.green("~")} ${updateVerb} ${path}`);
    for (const path of skipped) output.log(`  ${paint.dim("=")} Kept existing ${path}`);
    output.log(`\n${paint.bold("Next steps")}`);
    next.forEach((step, index) => output.log(`  ${index + 1}. ${step}`));
    return 0;
  },
};
