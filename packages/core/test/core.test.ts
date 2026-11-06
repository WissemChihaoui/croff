import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createCroff,
  CroffConfigError,
  defineConfig,
  definePlugin,
  expand,
  findDirectives,
  parse,
  PluginError,
  values,
} from "@croff/core";
import { ConfigLoadError, formatDiagnostic, loadConfig, Project } from "@croff/core/node";

describe("createCroff", () => {
  it("compiles with defaults", () => {
    expect(createCroff().compile(["gap(4)"]).css).toContain("gap: var(--croff-spacing-4);");
  });

  it("applies theme configuration", () => {
    const croff = createCroff(
      defineConfig({ theme: { colors: { accent: "#ABCDEF" }, breakpoints: { tablet: "800px" } } }),
    );
    const { css } = croff.compile(["tablet:bg(accent)"]);
    expect(css).toContain("--croff-color-accent: #abcdef;");
    expect(css).toContain("@media (min-width: 800px)");
  });

  it("throws on invalid tokens unless told otherwise", () => {
    const config = { theme: { spacing: { 1: "wide" } } };
    expect(() => createCroff(config)).toThrow(CroffConfigError);
    expect(createCroff(config, { strict: false }).issues).toHaveLength(1);
  });

  it("respects the variables setting", () => {
    expect(createCroff({ variables: "all" }).compile([]).css).toContain("--croff-color-muted");
    expect(createCroff({ variables: "none" }).compile(["gap(4)"]).css).not.toContain(":root");
  });

  it("supports the empty preset", () => {
    const croff = createCroff({ preset: "none", theme: { colors: { a: "red" } } });
    expect(croff.compile(["bg(a)"]).failures).toEqual([]);
    expect(croff.compile(["gap(4)"]).failures).toHaveLength(1);
  });
});

describe("directives", () => {
  it("finds directives, skipping comments and strings", () => {
    const css = `/* @croff; */ a { content: "@croff;"; } @croff; @croff reset;\n@croff-other; @croff`;
    expect(findDirectives(css).map((d) => d.params)).toEqual(["", "reset", ""]);
  });

  it("replaces directives in place", () => {
    const { css } = createCroff().processCss("a{}\n@croff;\nb{}", ["display(flex)"]);
    expect(css).toBe("a{}\n.display\\(flex\\) {\n  display: flex;\n}\nb{}");
  });

  it("supports separate layers in the order given", () => {
    const { css } = createCroff().processCss(
      "@croff reset;\n@croff utilities;\nx{}\n@croff theme;",
      ["gap(4)"],
    );
    const positions = ["box-sizing", ".gap", "x{}", ":root"].map((part) => css.indexOf(part));
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("reports unknown directives", () => {
    const { directiveErrors } = createCroff().processCss("@croff everything;", []);
    expect(directiveErrors[0]!.message).toContain('"@croff everything;"');
  });

  it("flags stylesheets with no directive", () => {
    expect(createCroff().processCss("a{}", []).hasDirective).toBe(false);
    expect(createCroff().processCss("a{}\n@croff;", []).hasDirective).toBe(true);
  });

  it("minifies surrounding CSS", () => {
    const { css } = createCroff().processCss("a {\n  b: c;\n}\n@croff;", ["display(flex)"], {
      minify: true,
    });
    expect(css).toBe("a{b:c}.display\\(flex\\){display:flex}");
  });

  it("leaves other text alone when there is no directive", () => {
    expect(createCroff().processCss("a{}", ["gap(4)"]).css).toBe("a{}");
  });
});

describe("plugins", () => {
  const plugin = definePlugin({
    name: "croff-plugin-test",
    theme: { colors: { pink: "#ff00aa" }, gradients: { sunrise: "linear-gradient(red,blue)" } },
    utilities: {
      "tab-size": {
        description: "Sets tab size.",
        args: [{ name: "size", types: [values.integer({ min: 1, max: 16 })] }],
        properties: ["tab-size"],
      },
      gradient: {
        description: "Applies a gradient token.",
        args: [{ name: "name", types: [values.token("gradients")] }],
        compile: ({ args }) => ({ "background-image": args[0]! }),
      },
    },
    variants: {
      dark: { atRule: "@media (prefers-color-scheme: dark)" },
      first: { selector: "&:first-child" },
    },
  });

  it("adds utilities, variants and theme tokens", () => {
    const { css, failures } = createCroff({ plugins: [plugin] }).compile([
      "tab-size(4)",
      "bg(pink)",
      "dark:first:gradient(sunrise)",
    ]);
    expect(failures).toEqual([]);
    expect(css).toContain("--croff-color-pink: #ff00aa;");
    expect(css).toContain("--croff-gradients-sunrise: linear-gradient(red,blue);");
    expect(css).toContain("tab-size: 4;");
    expect(css).toContain("@media (prefers-color-scheme: dark)");
    expect(css).toContain(".dark\\:first\\:gradient\\(sunrise\\):first-child");
  });

  it("gives the user's theme priority over plugins", () => {
    const { css } = createCroff({
      plugins: [plugin],
      theme: { colors: { pink: "#000000" } },
    }).compile(["bg(pink)"]);
    expect(css).toContain("--croff-color-pink: #000000;");
  });

  it("applies plugins in order, later themes winning", () => {
    const a = definePlugin({ name: "a", theme: { colors: { x: "red" } } });
    const b = definePlugin({ name: "b", theme: { colors: { x: "blue" } } });
    expect(createCroff({ plugins: [a, b] }).compile(["bg(x)"]).css).toContain("x: blue;");
  });

  it("sorts plugin utilities after built-ins", () => {
    const { rules } = createCroff({ plugins: [plugin] }).compile([
      "tab-size(4)",
      "opacity(50)",
      "display(flex)",
    ]);
    expect(rules.map((r) => r.expression)).toEqual(["display(flex)", "opacity(50)", "tab-size(4)"]);
  });

  it("orders breakpoint variants before plugin at-rules", () => {
    const { rules } = createCroff({ plugins: [plugin] }).compile([
      "dark:gap(4)",
      "xl:gap(4)",
      "gap(4)",
    ]);
    expect(rules.map((r) => r.expression)).toEqual(["gap(4)", "xl:gap(4)", "dark:gap(4)"]);
  });

  it("rejects conflicts unless the plugin opts in", () => {
    const conflicting = definePlugin({
      name: "conflict",
      utilities: { gap: { description: "x", args: [], compile: () => ({ gap: "1px" }) } },
    });
    expect(() => createCroff({ plugins: [conflicting] })).toThrow(PluginError);
    expect(() => createCroff({ plugins: [conflicting] })).toThrow(/Plugin "conflict".*already/);
    const allowed = { ...conflicting, override: true };
    expect(createCroff({ plugins: [allowed] }).compile(["gap()"]).css).toContain("gap: 1px;");
  });

  it("validates shape, version and duplicates", () => {
    const bad = (value: unknown) => () => createCroff({ plugins: [value as never] });
    expect(bad(null)).toThrow(PluginError);
    expect(bad({})).toThrow("valid package-style name");
    expect(bad({ name: "Bad Name" })).toThrow("valid package-style name");
    expect(bad({ name: "x", apiVersion: 99 })).toThrow("version 99");
    expect(bad({ name: "x", utilities: 3 })).toThrow('"utilities" must be an object');
    expect(() => createCroff({ plugins: [plugin, plugin] })).toThrow("registered twice");
  });

  it("names the plugin in definition errors", () => {
    const broken = definePlugin({
      name: "broken",
      variants: { x: { selector: ":hover" } },
    });
    expect(() => createCroff({ plugins: [broken] })).toThrow(/Plugin "broken".*must contain "&"/);
  });
});

describe("project", () => {
  let cwd: string;

  const write = async (path: string, content: string) => {
    const full = join(cwd, path);
    await mkdir(join(full, ".."), { recursive: true });
    await writeFile(full, content);
  };

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), "croff-project-"));
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  it("uses defaults without a config file", async () => {
    await write("src/a.html", '<a class="gap(4)">');
    const project = await Project.load({ cwd });
    expect(project.configPath).toBeUndefined();
    expect((await project.generate()).css).toContain(".gap\\(4\\)");
  });

  it("loads a TypeScript config", async () => {
    await write(
      "croff.config.ts",
      `const accent: string = "#123456";
       export default { content: ["app/**/*.html"], theme: { colors: { accent } } };`,
    );
    await write("app/a.html", '<a class="bg(accent)">');
    const project = await Project.load({ cwd });
    const { css } = await project.generate();
    expect(css).toContain("--croff-color-accent: #123456;");
  });

  it("loads JS configs and reports bad ones", async () => {
    await write("croff.config.mjs", "export default { preset: 'none' };");
    expect((await loadConfig(cwd)).config).toEqual({ preset: "none" });

    await write("croff.config.mjs", "export default 3;");
    await expect(loadConfig(cwd)).rejects.toThrow(ConfigLoadError);

    await write("croff.config.mjs", "syntax error here");
    await expect(loadConfig(cwd)).rejects.toThrow("Could not load");

    await expect(loadConfig(cwd, "missing.ts")).rejects.toThrow("not found");
  });

  it("sees config edits on reload", async () => {
    await write("croff.config.mjs", "export default { theme: { colors: { a: 'red' } } };");
    expect((await Project.load({ cwd })).engine.theme.scales["colors"]!["a"]).toBe("red");
    await write("croff.config.mjs", "export default { theme: { colors: { a: 'blue' } } };");
    expect((await Project.load({ cwd })).engine.theme.scales["colors"]!["a"]).toBe("blue");
  });

  it("classifies diagnostics by context", async () => {
    await write(
      "src/a.html",
      `<a class="nope(1) gap(banana) gap(4 bg(\${c})">
       <b class="width[calc(1px - 2px)]">`,
    );
    await write(
      "src/b.ts",
      `const known = "gap(zzz)";
       const unknown = "nope2(1)";
       run(1)
       `,
    );
    const project = await Project.load({ cwd });
    const { diagnostics } = await project.generate();
    const summary = diagnostics.map((d) => [d.severity, d.code, d.expression ?? d.file]);
    expect(summary).toContainEqual(["error", "unknown-utility", "nope(1)"]);
    expect(summary).toContainEqual(["error", "invalid-argument", "gap(banana)"]);
    expect(summary).toContainEqual(["warning", "invalid-argument", "gap(zzz)"]);
    expect(summary).toContainEqual(["error", "whitespace", "src/a.html"]);
    expect(summary).toContainEqual(["warning", "dynamic-expression", "src/a.html"]);
    expect(summary.some(([, , name]) => name === "nope2(1)" || name === "run(1)")).toBe(false);
  });

  it("formats diagnostics with one-based positions and hints", async () => {
    await write("src/a.html", '\n <a class="pad(4)">');
    const { diagnostics } = await (await Project.load({ cwd })).generate();
    expect(formatDiagnostic(diagnostics[0]!)).toBe(
      `src/a.html:2:12: error unknown-utility: Unknown utility "pad".\n  hint: Did you mean "padding"?`,
    );
  });

  it("processes stylesheets using scanned expressions", async () => {
    await write("src/a.html", '<a class="gap(4)">');
    const project = await Project.load({ cwd });
    const { css } = await project.processCss("/* top */\n@croff;\n");
    expect(css).toContain("/* top */");
    expect(css).toContain(".gap\\(4\\)");
    expect(css).not.toContain("@croff");
  });

  it("maps rules back to source files", async () => {
    await write("src/a.html", '\n\n  <a class="display(flex)">');
    const { map } = await (await Project.load({ cwd })).generate({ sourceMap: true });
    expect(map?.sources).toEqual(["src/a.html"]);
  });

  it("recompiles after changes", async () => {
    await write("src/a.html", '<a class="gap(4)">');
    const project = await Project.load({ cwd });
    await project.generate();
    await write("src/a.html", '<a class="gap(8)">');
    const scan = await project.updateFile(join(cwd, "src/a.html"));
    expect(scan.changed).toBe(true);
    const { css } = await project.generate();
    expect(css).toContain(".gap\\(8\\)");
    expect(css).not.toContain(".gap\\(4\\)");
  });

  it("applies overrides on top of the file", async () => {
    await write("croff.config.mjs", "export default { content: ['nope/**'] };");
    const project = await Project.load({ cwd, overrides: { content: ["src/**"] } });
    expect(project.scanner.content).toEqual(["src/**"]);
  });
});

describe("source maps through a stylesheet", () => {
  const input = [
    { expression: "display(flex)", location: { file: "src/a.html", line: 2, column: 4 } },
  ];

  it("maps generated rules at their position in the stylesheet", () => {
    const { css, map } = createCroff().processCss("a {\n  b: c;\n}\n@croff;\n", input, {
      sourceMap: true,
      file: "out.css",
    });
    expect(css.split("\n")[3]).toBe(".display\\(flex\\) {");
    expect(map).toMatchObject({ version: 3, file: "out.css", sources: ["src/a.html"] });
    // Three blank mappings for the lines before the rule, then source 0, line 2, column 4.
    expect(map!.mappings).toBe(";;;AAEI");
  });

  it("maps correctly when minified", () => {
    const { css, map } = createCroff().processCss("a {\n  b: c;\n}\n@croff;\n", input, {
      sourceMap: true,
      minify: true,
    });
    expect(css).toBe("a{b:c}.display\\(flex\\){display:flex}");
    // Generated column 6, after "a{b:c}".
    expect(map!.mappings).toBe("MAEI");
  });

  it("gives no map unless asked", () => {
    expect(createCroff().processCss("@croff;", input).map).toBeUndefined();
  });
});

describe("variant groups through a project", () => {
  let cwd: string;
  const write = async (path: string, content: string) => {
    const full = join(cwd, path);
    await mkdir(join(full, ".."), { recursive: true });
    await writeFile(full, content);
  };

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), "croff-groups-"));
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  it("compiles a group found in a file", async () => {
    await write("src/a.html", '<a class="md:(gap(4),hover:bg(brand))">');
    const { css, diagnostics } = await (await Project.load({ cwd })).generate();
    expect(diagnostics).toEqual([]);
    expect(css).toContain(".md\\:\\(gap\\(4\\)\\,hover\\:bg\\(brand\\)\\):hover {");
  });

  it("points a diagnostic at the failing member", async () => {
    await write("src/a.html", '\n <a class="md:(gap(4),pad(4))">');
    const { diagnostics } = await (await Project.load({ cwd })).generate();
    expect(diagnostics).toMatchObject([
      {
        severity: "error",
        code: "unknown-utility",
        expression: "md:pad(4)",
        suggestion: "md:padding(4)",
        file: "src/a.html",
        line: 1,
        // The class starts at column 11; pad(4) is 11 characters into it.
        column: 22,
      },
    ]);
    expect(formatDiagnostic(diagnostics[0]!)).toContain("src/a.html:2:23:");
  });

  it("points a syntax error at the broken token", async () => {
    await write("src/a.html", '<a class="md:(gap(4),)">');
    const { diagnostics } = await (await Project.load({ cwd })).generate();
    expect(diagnostics).toMatchObject([
      { code: "empty-group-member", expression: "md:(gap(4),)", line: 0, column: 21 },
    ]);
  });

  it("applies context rules to members", async () => {
    await write("src/a.ts", 'const known = "md:(gap(zzz))"; const other = "md:(nope(1))";');
    const { diagnostics } = await (await Project.load({ cwd })).generate();
    expect(diagnostics.map((d) => [d.severity, d.code, d.expression])).toEqual([
      ["warning", "invalid-argument", "md:gap(zzz)"],
    ]);
  });

  it("reports whitespace in a group", async () => {
    await write("src/a.html", '<a class="md:(gap(4), gap(8))">');
    const { diagnostics } = await (await Project.load({ cwd })).generate();
    expect(diagnostics.map((d) => d.code)).toEqual(["whitespace"]);
  });

  it("drops rules when a group is edited", async () => {
    await write("src/a.html", '<a class="md:(gap(4),gap(8))">');
    const project = await Project.load({ cwd });
    await project.generate();
    await write("src/a.html", '<a class="md:(gap(8))">');
    expect((await project.updateFile(join(cwd, "src/a.html"))).changed).toBe(true);
    const { css } = await project.generate();
    expect(css).not.toContain("--croff-spacing-4");
    expect(css).toContain("--croff-spacing-8");
  });

  it("works with plugin utilities and variants", () => {
    const croff = createCroff({
      plugins: [
        definePlugin({
          name: "group-plugin",
          utilities: {
            "tab-size": {
              description: "x",
              args: [{ name: "n", types: [values.integer({ min: 1, max: 8 })] }],
              properties: ["tab-size"],
            },
          },
          variants: { first: { selector: "&:first-child" } },
        }),
      ],
    });
    const { css, failures } = croff.compile(["first:(tab-size(4),gap(4))"]);
    expect(failures).toEqual([]);
    expect(css).toContain("tab-size: 4;");
    expect(css).toContain(":first-child");
  });

  it("works through a stylesheet directive", () => {
    const { css } = createCroff().processCss("@croff;", ["hover:(display(flex))"], {
      minify: true,
    });
    expect(css).toBe(".hover\\:\\(display\\(flex\\)\\):hover{display:flex}");
  });

  it("exposes the parser's expansion", () => {
    const parsed = parse("md:(gap(4))");
    expect(parsed.ok && expand(parsed.node)[0]!.expression).toBe("md:gap(4)");
  });
});
