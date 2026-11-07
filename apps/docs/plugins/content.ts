import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { builtinUtilities, createCroff, preferenceVariants, stateVariants } from "@croff/core";
import type { Plugin } from "vite";
import { parseFrontmatter, pageSections, renderMarkdown } from "../src/lib/markdown.ts";
import type { SearchEntry } from "../src/lib/search.ts";
import { flatPages, nav, utilityPath } from "../src/nav.ts";
import { SAMPLES } from "../src/lib/component-samples.ts";

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = resolve(here, "../content");
const SEARCH_INDEX = "virtual:search-index";

/** Replaces `{{include path}}` with another file's text, so that there's only one changelog. */
function applyIncludes(source: string, file: string): { source: string; included: string[] } {
  const included: string[] = [];
  const text = source.replace(/\{\{include (.+?)\}\}/g, (_all, path: string) => {
    const target = resolve(dirname(file), path);
    included.push(target);
    return readFileSync(target, "utf8");
  });
  return { source: text, included };
}

function groupOf(slug: string): string {
  return nav.find((section) => section.pages.some((page) => page.slug === slug))?.title ?? "Docs";
}

export function buildSearchIndex(): SearchEntry[] {
  const entries: SearchEntry[] = [];

  for (const page of flatPages()) {
    if (page.kind) continue;
    const file = join(contentDir, `${page.slug}.md`);
    const { source } = applyIncludes(readFileSync(file, "utf8"), file);
    const { data } = parseFrontmatter(source);
    const path = `/docs/${page.slug}`;
    const group = groupOf(page.slug);
    const title = data["title"] ?? page.title;
    for (const section of pageSections(source)) {
      entries.push({
        title,
        heading: section.heading,
        group,
        path: section.id ? `${path}#${section.id}` : path,
        text: section.heading ? section.text : `${data["description"] ?? ""} ${section.text}`,
        kind: section.heading ? "section" : "page",
      });
    }
  }

  const { theme } = createCroff();
  for (const utility of builtinUtilities) {
    const values = (utility.args ?? [])
      .flatMap((arg) => arg.types.flatMap((type) => type.describe(theme).values ?? []))
      .slice(0, 30);
    entries.push({
      title: utility.name,
      heading: "",
      group: `Utilities: ${utility.category}`,
      path: `${utilityPath(utility.category)}#${utility.name}`,
      text: `${utility.description} ${utility.examples.join(" ")} ${values.join(" ")}`,
      kind: "utility",
    });
  }
  for (const sample of SAMPLES) {
    entries.push({
      title: sample.title,
      heading: "",
      group: "Components",
      path: `/docs/components/gallery#${sample.id}`,
      text: sample.description,
      kind: "page",
    });
  }
  for (const variant of [...stateVariants, ...preferenceVariants]) {
    entries.push({
      title: `${variant.name}:`,
      heading: "",
      group: "Utilities: variants",
      path: `/docs/utilities/interactions#${variant.name}`,
      text: variant.description ?? "",
      kind: "variant",
    });
  }
  return entries;
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

/** Compiles Markdown pages into modules, and generates the search index. */
export function docsContent(): Plugin {
  return {
    name: "croff-docs-content",
    enforce: "pre",

    resolveId(id) {
      return id === SEARCH_INDEX ? `\0${SEARCH_INDEX}` : null;
    },

    load(id) {
      if (id !== `\0${SEARCH_INDEX}`) return null;
      for (const file of walk(contentDir)) this.addWatchFile(file);
      return `export default ${JSON.stringify(buildSearchIndex())};`;
    },

    transform(code, id) {
      const file = id.split("?")[0]!;
      if (!file.endsWith(".md") || relative(contentDir, file).startsWith("..")) return null;
      const { source, included } = applyIncludes(code, file);
      for (const path of included) this.addWatchFile(path);
      return { code: `export default ${JSON.stringify(renderMarkdown(source))};`, map: null };
    },
  };
}
