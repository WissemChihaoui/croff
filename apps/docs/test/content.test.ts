import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  builtinUtilities,
  createCroff,
  utilityCategories,
  type CroffConfig,
  type CroffPlugin,
} from "@croff/core";
import { COMMANDS, run } from "../../../packages/cli/src/index.js";
import { extractCandidates } from "@croff/scanner/extract";
import { buildSearchIndex } from "../plugins/content";
import { highlight, highlightExpression } from "../src/lib/highlight";
import {
  compileSample,
  pageSections,
  parseFrontmatter,
  renderMarkdown,
  slugify,
} from "../src/lib/markdown";
import { generatedCss, signatures, usageExamples } from "../src/lib/reference";
import { search } from "../src/lib/search";
import { allRoutes, flatPages, nav } from "../src/nav";

const root = fileURLToPath(new URL("../", import.meta.url));
const contentDir = join(root, "content");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const pages = walk(contentDir).map((file) => {
  const slug = relative(contentDir, file).replaceAll("\\", "/").replace(/\.md$/, "");
  const source = readFileSync(file, "utf8").replace(/\{\{include .+?\}\}/, "");
  return { slug, source, rendered: renderMarkdown(source) };
});

function codeBlocks(source: string): { language: string; meta: string[]; code: string }[] {
  const blocks = [];
  const fence = /^```(\S*)([^\n]*)\n([\s\S]*?)^```/gm;
  for (let match = fence.exec(source); match; match = fence.exec(source)) {
    blocks.push({ language: match[1]!, meta: match[2]!.trim().split(/\s+/), code: match[3]! });
  }
  return blocks;
}

describe("navigation", () => {
  it("has a Markdown file for every page", () => {
    for (const page of flatPages()) {
      if (page.kind === "utilities") continue;
      expect(existsSync(join(contentDir, `${page.slug}.md`)), page.slug).toBe(true);
    }
  });

  it("links to every Markdown file", () => {
    const slugs = new Set(flatPages().map((page) => page.slug));
    for (const { slug } of pages) expect(slugs, slug).toContain(slug);
  });

  it("has a reference page for every category of utility", () => {
    const pagesByCategory = nav
      .flatMap((section) => section.pages)
      .filter((page) => page.kind === "utilities");
    const categories = pagesByCategory.map((page) => page.category);
    for (const category of utilityCategories) expect(categories).toContain(category);
    expect(categories).toContain("interactions");
  });

  it("covers every section the documentation promises", () => {
    expect(nav.map((section) => section.title)).toEqual([
      "Introduction",
      "Getting Started",
      "Core Concepts",
      "Utilities",
      "Configuration",
      "Integrations",
      "Extending CROFF",
      "CLI Reference",
      "Advanced",
      "Community",
    ]);
  });
});

describe("pages", () => {
  it("all have a title and description", () => {
    for (const { slug, source } of pages) {
      const { data } = parseFrontmatter(source);
      expect(data["title"], slug).toBeTruthy();
      expect(data["description"], slug).toBeTruthy();
    }
  });

  it("only link to pages and anchors that exist", () => {
    const routes = new Set(allRoutes());
    const anchors = new Map(pages.map(({ slug, rendered }) => [`/docs/${slug}`, rendered.html]));
    for (const { slug, rendered } of pages) {
      for (const match of rendered.html.matchAll(/<a href="(\/[^"]*)"/g)) {
        const [path, hash] = match[1]!.split("#");
        expect(routes, `${slug} links to ${match[1]}`).toContain(path);
        if (hash && anchors.has(path!)) {
          expect(anchors.get(path!), `${slug} links to ${match[1]}`).toContain(`id="${hash}"`);
        }
      }
    }
  });
});

describe("code examples", () => {
  it("only use valid expressions in markup", () => {
    const croff = createCroff({
      theme: {
        colors: {
          accent: "#000000",
          surface: "#000000",
          slate: { 100: "#000000", 500: "#000000" },
        },
        spacing: { 7: "1rem", gutter: "1rem" },
      },
      plugins: [
        {
          name: "docs-example",
          utilities: {
            "line-clamp": {
              description: "x",
              args: [
                {
                  name: "n",
                  types: [{ kind: "x", describe: () => ({ label: "x" }), resolve: () => "1" }],
                },
              ],
              properties: ["x"],
            },
          },
          variants: {
            first: { selector: "&:first-child" },
            "not-last": { selector: "&:not(:last-child)" },
            dark: { atRule: "@media (prefers-color-scheme: dark)" },
          },
        },
      ],
    });
    let checked = 0;
    for (const { slug, source } of pages) {
      for (const block of codeBlocks(source)) {
        if (!["html", "tsx", "jsx"].includes(block.language)) continue;
        const { candidates } = extractCandidates(block.code);
        const inClass = candidates
          .filter((candidate) => candidate.context === "class")
          .map((c) => c.expression);
        const { failures } = croff.compile(inClass);
        expect(
          failures.map((failure) => `${slug}: ${failure.expression}: ${failure.error.message}`),
        ).toEqual([]);
        checked += inClass.length;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it("compiles the samples marked for it", () => {
    let compiled = 0;
    for (const { source } of pages) {
      for (const block of codeBlocks(source)) {
        if (block.meta.includes("compile")) {
          expect(compileSample(block.code).length).toBeGreaterThan(0);
          compiled++;
        }
      }
    }
    expect(compiled).toBeGreaterThan(5);
  });

  it("refuses to compile an invalid sample", () => {
    expect(() => compileSample('<div class="gap(banana)"></div>')).toThrow("Invalid sample");
  });

  it("shows real compiler output next to marked samples", () => {
    const { html } = renderMarkdown('```html compile\n<div class="gap(4)"></div>\n```');
    expect(html).toContain("Generated CSS");
    expect(html).toContain("var(--croff-spacing-4)");
  });
});

describe("generated reference", () => {
  const engine = createCroff();

  it("compiles every example and usage line", () => {
    for (const utility of builtinUtilities) {
      expect(generatedCss(engine, utility.examples).length, utility.name).toBeGreaterThan(0);
      expect(generatedCss(engine, usageExamples(utility)).length, utility.name).toBeGreaterThan(0);
    }
  });

  it("shows the forms a utility accepts", () => {
    const find = (name: string) => builtinUtilities.find((utility) => utility.name === name)!;
    expect(signatures(find("gap"))).toEqual(["gap(value)", "gap[raw-css]"]);
    expect(signatures(find("flex"))).toEqual(["flex()", "flex(direction)"]);
    expect(signatures(find("border"))).toEqual([
      "border()",
      "border(width)",
      "border(width,color)",
      "border[raw-css]",
    ]);
    expect(signatures(find("transform"))).toEqual(["transform(functions,…)", "transform[raw-css]"]);
  });

  it("fails loudly instead of documenting an invalid example", () => {
    expect(() => generatedCss(engine, ["gap(banana)"])).toThrow("Invalid example");
  });
});

describe("search", () => {
  const index = buildSearchIndex();

  it("indexes pages, headings, utilities and examples", () => {
    expect(index.some((entry) => entry.kind === "page")).toBe(true);
    expect(index.some((entry) => entry.kind === "section")).toBe(true);
    expect(index.filter((entry) => entry.kind === "utility")).toHaveLength(builtinUtilities.length);
    expect(index.some((entry) => entry.kind === "variant")).toBe(true);
  });

  it("ranks an exact utility name first", () => {
    expect(search(index, "gap")[0]!.entry).toMatchObject({ title: "gap", kind: "utility" });
    expect(search(index, "padding-x")[0]!.entry.title).toBe("padding-x");
  });

  it("finds page titles and headings", () => {
    expect(search(index, "troubleshooting")[0]!.entry.title).toBe("Troubleshooting");
    expect(search(index, "source maps").map((result) => result.entry.heading)).toContain(
      "Source maps",
    );
  });

  it("finds example text", () => {
    expect(search(index, "translate-y").length).toBeGreaterThan(0);
  });

  it("finds API references and variants", () => {
    expect(search(index, "definePlugin").length).toBeGreaterThan(0);
    expect(search(index, "hover")[0]!.entry.title).toBe("hover:");
  });

  it("requires every term, and tolerates an empty query", () => {
    expect(search(index, "gap zzzqqq")).toEqual([]);
    expect(search(index, "   ")).toEqual([]);
  });

  it("only points to routes and anchors that exist", () => {
    const routes = new Set(allRoutes());
    for (const entry of index) expect(routes, entry.path).toContain(entry.path.split("#")[0]);
  });

  it("creates the same anchors as the page renderer", () => {
    for (const { slug, source, rendered } of pages) {
      for (const section of pageSections(source)) {
        if (section.id)
          expect(rendered.html, `${slug}#${section.id}`).toContain(`id="${section.id}"`);
      }
    }
  });
});

describe("markdown", () => {
  it("assigns stable, unique heading ids", () => {
    const { html, headings } = renderMarkdown("## One thing\n\n## One thing\n\n### `code` here");
    expect(headings.map((heading) => heading.id)).toEqual([
      "one-thing",
      "one-thing-1",
      "code-here",
    ]);
    expect(html).toContain('id="one-thing-1"');
  });

  it("tolerates a byte order mark and CRLF line endings", () => {
    expect(renderMarkdown("\uFEFF---\r\ntitle: T\r\n---\r\nBody")).toMatchObject({ title: "T" });
  });

  it("reads frontmatter", () => {
    expect(renderMarkdown("---\ntitle: A: B\ndescription: C\n---\nBody")).toMatchObject({
      title: "A: B",
      description: "C",
    });
  });

  it("slugifies", () => {
    expect(slugify("What is CROFF?")).toBe("what-is-croff");
  });
});

describe("highlighter", () => {
  it("colors the parts of an expression", () => {
    const html = highlightExpression("md:bg(brand)");
    expect(html).toContain('<span class="t-variant">md</span>');
    expect(html).toContain('<span class="t-utility">bg</span>');
    expect(html).toContain('<span class="t-arg">brand</span>');
    expect(highlightExpression("bg[#000]")).toContain('<span class="t-raw">#000</span>');
  });

  it("recognizes class attributes", () => {
    expect(highlight('<div class="gap(4)">', "html")).toContain("t-utility");
    expect(highlight('<div className="gap(4)" />', "tsx")).toContain("t-utility");
  });

  it("always escapes markup", () => {
    for (const language of ["html", "tsx", "css", "bash", "json", "text", "croff"]) {
      const output = highlight('<img src=x onerror="alert(1)"> </style>', language);
      expect(output, language).not.toMatch(/<img/);
      expect(output, language).not.toMatch(/<\/style/);
    }
  });

  it("preserves the text exactly", () => {
    const strip = (html: string) =>
      html
        .replace(/<[^>]+>/g, "")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&quot;", '"')
        .replaceAll("&amp;", "&");
    for (const { source } of pages.slice(0, 20)) {
      for (const block of codeBlocks(source)) {
        expect(strip(highlight(block.code, block.language))).toBe(block.code);
      }
    }
  });
});

describe("playground", () => {
  it("uses the real compiler and scanner, not samples", () => {
    const engine = readFileSync(join(root, "src/lib/engine.ts"), "utf8");
    expect(engine).toContain('from "@croff/core"');
    expect(engine).toContain('from "@croff/scanner/extract"');
  });
});

describe("built site", () => {
  const dist = join(root, "dist/client");
  const built = existsSync(join(dist, "index.html"));

  it.runIf(built)("prerenders every route with real content", () => {
    for (const route of allRoutes()) {
      const file =
        route === "/" ? join(dist, "index.html") : join(dist, route.slice(1), "index.html");
      const html = readFileSync(file, "utf8");
      expect(html, route).toContain("<title>");
      expect(html, route).not.toContain("<!--app-->");
      expect(html.length, route).toBeGreaterThan(2000);
    }
  });

  it.runIf(built)("gives each route its own page, not the landing page", () => {
    for (const page of flatPages()) {
      const html = readFileSync(join(dist, "docs", page.slug, "index.html"), "utf8");
      expect(html, page.slug).not.toContain("<title>CROFF: style without the noise</title>");
      expect(html, page.slug).toContain(`<main`);
    }
    expect(readFileSync(join(dist, "404.html"), "utf8")).toContain("This page doesn");
  });

  it.runIf(built)("has no broken internal links", () => {
    const routes = new Set([...allRoutes(), "/404"]);
    for (const route of allRoutes()) {
      const file =
        route === "/" ? join(dist, "index.html") : join(dist, route.slice(1), "index.html");
      const html = readFileSync(file, "utf8");
      for (const match of html.matchAll(/<a[^>]+href="(\/[^"#]*)[^"]*"/g)) {
        expect(routes, `${route} links to ${match[1]}`).toContain(match[1]);
      }
    }
  });

  it.runIf(built)("generates the utility reference from the registry", () => {
    for (const utility of builtinUtilities) {
      const html = readFileSync(
        join(dist, "docs/utilities", utility.category, "index.html"),
        "utf8",
      );
      expect(html, utility.name).toContain(`id="${utility.name}"`);
    }
  });

  it.runIf(built)("ships a stylesheet compiled by CROFF", () => {
    const assets = readdirSync(join(dist, "assets")).filter((file) => file.endsWith(".css"));
    const css = assets.map((file) => readFileSync(join(dist, "assets", file), "utf8")).join("");
    expect(css).toContain("--croff-color-brand");
    expect(css).not.toContain("@croff");
  });
});

describe("code samples beyond markup", () => {
  const blocks = pages.flatMap(({ slug, source }) =>
    codeBlocks(source).map((block) => ({ ...block, slug })),
  );
  const samplesDir = join(root, "test/.samples");

  it("only shows CSS that parses, with valid directives", () => {
    const css = blocks.filter((block) => block.language === "css");
    expect(css.length).toBeGreaterThan(5);
    for (const block of css) {
      expect(() => postcss.parse(block.code), block.slug).not.toThrow();
      const { directiveErrors } = createCroff().processCss(block.code, []);
      expect(directiveErrors, block.slug).toEqual([]);
    }
  });

  it("only shows valid CLI commands", async () => {
    const silent = { log: () => {}, error: () => {} };
    let checked = 0;
    for (const block of blocks.filter((candidate) => candidate.language === "bash")) {
      for (const line of block.code.split("\n")) {
        const match = /^(?:pnpm (?:exec )?)?croff\s+(.+)$/.exec(line.trim());
        if (!match || match[1]!.includes("<")) continue;
        const args = match[1]!.split(/\s+/);
        // --help makes each command validate its options, without doing anything.
        expect(await run([...args, "--help"], silent), `${block.slug}: ${line}`).toBe(0);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(5);
  });

  it("documents every CLI command and option", () => {
    const reference = pages.find((page) => page.slug === "cli/reference")!.source;
    for (const [name, command] of Object.entries(COMMANDS)) {
      const start = reference.indexOf(`## croff ${name}`);
      expect(start, name).toBeGreaterThan(-1);
      const section = reference.slice(start, reference.indexOf("\n## ", start + 1));
      for (const option of command.options) {
        expect(section, `croff ${name} --${option.name}`).toContain(`--${option.name}`);
      }
    }
  });

  const isModule = (code: string) => /^(?:import|export) /m.test(code);
  const programs = blocks.filter(
    (block) => ["ts", "tsx", "js"].includes(block.language) && isModule(block.code),
  );

  beforeAll(() => {
    rmSync(samplesDir, { recursive: true, force: true });
    mkdirSync(samplesDir, { recursive: true });
    programs.forEach((block, index) => {
      const extension = block.language === "tsx" ? "tsx" : "ts";
      writeFileSync(join(samplesDir, `sample-${index}.${extension}`), block.code);
    });
    writeFileSync(
      join(samplesDir, "tsconfig.json"),
      JSON.stringify({
        extends: "../../tsconfig.json",
        compilerOptions: { allowImportingTsExtensions: true },
        include: ["*.ts", "*.tsx"],
      }),
    );
  });

  afterAll(() => {
    rmSync(samplesDir, { recursive: true, force: true });
  });

  it("has config and plugin samples that the real engine accepts", async () => {
    let checked = 0;
    for (const [index, block] of programs.entries()) {
      if (!/from "@croff\/core"/.test(block.code) || !block.code.includes("export default"))
        continue;
      const module = (await import(/* @vite-ignore */ join(samplesDir, `sample-${index}.ts`))) as {
        default: CroffConfig | CroffPlugin;
      };
      const value = module.default;
      const config: CroffConfig = "name" in value ? { plugins: [value] } : value;
      expect(() => createCroff(config), `${block.slug}: ${block.code}`).not.toThrow();
      checked++;
    }
    expect(checked).toBeGreaterThan(10);
  });

  it("has TypeScript samples that typecheck", () => {
    expect(programs.length).toBeGreaterThan(15);
    const tsc = createRequire(join(root, "package.json")).resolve("typescript/bin/tsc");
    const result = spawnSync(process.execPath, [tsc, "-p", samplesDir], { encoding: "utf8" });
    // Name the sample each error came from.
    const named = result.stdout.replace(/sample-(\d+)/g, (all, index: string) => {
      const block = programs[Number(index)]!;
      return `${all} (${block.slug})`;
    });
    expect(named).toBe("");
    expect(result.status).toBe(0);
  }, 120_000);
});

describe("stability markers", () => {
  it.each([
    ["packages/plugin-api/src/index.ts", "export interface CroffPlugin"],
    ["packages/plugin-api/src/index.ts", "export function definePlugin"],
    ["packages/registry/src/types.ts", "export interface ValueType"],
    ["packages/registry/src/types.ts", "export interface UtilityDefinition"],
    ["packages/registry/src/types.ts", "export interface VariantDefinition"],
    ["packages/registry/src/registry.ts", "export class Registry"],
    ["packages/compiler/src/compiler.ts", "export interface CompiledRule"],
    ["packages/parser/src/ast.ts", "export interface UtilityNode"],
    ["packages/core/src/node.ts", "export class Project"],
    ["packages/parser/src/parser.ts", "export function parse"],
    ["packages/parser/src/expand.ts", "export function expand"],
    ["packages/parser/src/expand.ts", "export interface ExpandedExpression"],
    ["packages/parser/src/ast.ts", "export interface GroupNode"],
  ])("%s marks %s as unstable", (file, declaration) => {
    const source = readFileSync(join(root, "../..", file), "utf8");
    const at = source.indexOf(declaration);
    expect(at).toBeGreaterThan(-1);
    const comment = source.slice(source.lastIndexOf("/**", at), at);
    expect(comment).toContain("@unstable");
  });

  it("explains them in the documentation", () => {
    expect(pages.find((page) => page.slug === "extending/plugin-api")!.source).toContain(
      "@unstable",
    );
  });
});

describe("included content", () => {
  it("renders the real changelog", () => {
    const source = readFileSync(join(contentDir, "community/changelog.md"), "utf8");
    const included = source.match(/\{\{include (.+?)\}\}/)![1]!;
    const changelog = readFileSync(join(contentDir, "community", included), "utf8");
    expect(changelog).toContain("## 0.1.0");
    expect(renderMarkdown(changelog).headings.length).toBeGreaterThan(2);
  });
});

describe("variant groups in the docs site", () => {
  it("has a page, and a playground preset that the real compiler accepts", async () => {
    expect(allRoutes()).toContain("/docs/concepts/variant-groups");
    const { PRESETS } = await import("../src/lib/samples");
    const { candidates, broken } = extractCandidates(PRESETS["Variant groups"]!);
    expect(broken).toEqual([]);
    expect(candidates.some((candidate) => candidate.expression.includes(":("))).toBe(true);
    expect(createCroff().compile(candidates.map((c) => c.expression)).failures).toEqual([]);
  });

  it("colors each member of a group, and keeps the text exact", () => {
    const source = "md:(gap(4),hover:(bg(brand),width[calc(1px+2px)]),font['a,b',serif])";
    const html = highlightExpression(source);
    expect(html).toContain('<span class="t-utility">gap</span>');
    expect(html).toContain('<span class="t-variant">hover</span>');
    expect(html).toContain('<span class="t-raw">calc(1px+2px)</span>');
    expect(html.replace(/<[^>]+>/g, "").replaceAll("&#39;", "'")).toBe(source);
  });

  it("finds it in search", () => {
    const index = buildSearchIndex();
    expect(search(index, "variant groups")[0]!.entry.title).toBe("Variant groups");
  });
});

describe("color and scale in the docs", () => {
  it("are in the generated reference", () => {
    const find = (name: string) => builtinUtilities.find((utility) => utility.name === name)!;
    expect(find("color").category).toBe("typography");
    expect(find("scale").category).toBe("effects");
    const engine = createCroff();
    expect(generatedCss(engine, find("scale").examples)).toContain("transform: scale(1.05);");
    expect(signatures(find("scale"))).toEqual(["scale(percent)", "scale[raw-css]"]);
  });

  it("are the preferred names in written documentation and playground examples", async () => {
    const { PRESETS, HERO_SAMPLE, COMPARE_SAMPLE } = await import("../src/lib/samples");
    for (const sample of [...Object.values(PRESETS), HERO_SAMPLE, COMPARE_SAMPLE]) {
      expect(sample).not.toMatch(/\btext-color\(/);
    }
    expect(PRESETS["Variant groups"]).toContain("scale(105)");
    for (const { slug, source } of pages) {
      expect(source, slug).not.toMatch(/\btext-color[([]/);
    }
  });
});

describe("error documentation", () => {
  const source = (slug: string) => pages.find((page) => page.slug === slug)!.source;

  it("distinguishes syntax errors from resolution errors", () => {
    const parsing = source("concepts/parsing");
    expect(parsing).toContain("## Two kinds of error");
    expect(parsing).toContain("## Syntax errors");
    expect(parsing).toContain("## Resolution errors");
    const groups = source("concepts/variant-groups");
    expect(groups).toContain("Syntax errors reject the whole group");
    expect(groups).toContain("Resolution errors reject only that member");
  });

  it.each([
    "empty",
    "whitespace",
    "invalid-character",
    "invalid-name",
    "missing-value",
    "unexpected-token",
    "unterminated-call",
    "empty-argument",
    "unterminated-bracket",
    "unbalanced-bracket",
    "empty-bracket",
    "misplaced-bracket",
    "trailing-escape",
    "duplicate-variant",
    "too-deep",
    "group-without-variant",
    "empty-group",
    "empty-group-member",
    "unterminated-group",
    "unknown-utility",
    "unknown-variant",
    "invalid-argument",
    "missing-argument",
    "too-many-arguments",
    "call-not-supported",
    "bracket-not-supported",
    "unsafe-value",
  ])("documents %s", (code) => {
    expect(source("concepts/parsing")).toContain(`\`${code}\``);
  });
});
