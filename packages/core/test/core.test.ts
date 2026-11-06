import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createCroff,
  CroffConfigError,
  defineConfig,
  definePlugin,
  findDirectives,
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

describe("plugins that misbehave", () => {
  const withUtility = (utility: Record<string, unknown>) =>
    createCroff({
      plugins: [
        definePlugin({
          name: "croff-plugin-test",
          utilities: { bad: { description: "", ...utility } as never },
        }),
      ],
    });
  const word = { name: "value", types: [values.words("x")] };

  it("keeps compiling when a utility's compile function throws", () => {
    const croff = withUtility({
      args: [word],
      compile: () => {
        throw new Error("boom");
      },
    });
    const { css, failures } = croff.compile(["bad(x)", "gap(4)"], { minify: true });
    expect(css).toContain(".gap\\(4\\)");
    expect(failures).toMatchObject([{ expression: "bad(x)", error: { code: "utility-error" } }]);
    const { message } = failures[0]!.error;
    expect(message).toContain('Plugin "croff-plugin-test"');
    expect(message).toContain('"bad"');
    expect(message).toContain("boom");
  });

  it("keeps compiling when a bracket function or a value type throws", () => {
    const fails = () => {
      throw new Error("boom");
    };
    expect(withUtility({ arbitrary: fails }).compile(["bad[1px]"]).failures).toMatchObject([
      { error: { code: "utility-error" } },
    ]);
    const type = { kind: "custom", describe: () => ({ label: "x" }), resolve: fails };
    const croff = withUtility({ args: [{ name: "value", types: [type] }], properties: ["width"] });
    expect(croff.compile(["bad(x)"]).failures).toMatchObject([
      { error: { code: "utility-error" } },
    ]);
  });

  it("names a utility that throws without a plugin", () => {
    const croff = createCroff();
    croff.registry.addUtility({
      name: "bad",
      category: "test",
      description: "",
      examples: [],
      args: [word],
      compile: () => {
        throw new Error("boom");
      },
    });
    const { message } = croff.compile(["bad(x)"]).failures[0]!.error;
    expect(message).toContain('Utility "bad"');
    expect(message).not.toContain("Plugin");
  });

  it.each([
    ["a value that ends the rule", { width: "1px}body{display:none" }],
    ["a value that ends the declaration", { width: "1px;color:red" }],
    ["an unterminated value", { width: "url(a" }],
    ["an empty value", { width: " " }],
    ["a value that isn't a string", { width: 1 }],
    ["a property that ends the rule", { "width}body{color": "red" }],
    ["an empty property", { "": "red" }],
  ])("rejects %s from compile", (_label, output) => {
    const croff = withUtility({ args: [word], compile: () => output });
    const { css, failures, rules } = croff.compile(["bad(x)", "gap(4)"]);
    expect(failures).toMatchObject([{ expression: "bad(x)", error: { code: "unsafe-output" } }]);
    expect(rules.map((rule) => rule.expression)).toEqual(["gap(4)"]);
    expect(css).not.toContain("body");
    expect(css).not.toContain("bad");
    expect(failures[0]!.error.message).toContain('Plugin "croff-plugin-test"');
  });

  it("rejects a compile function that returns nothing", () => {
    const croff = withUtility({ args: [word], compile: () => undefined });
    expect(croff.compile(["bad(x)"]).failures).toMatchObject([
      { error: { code: "unsafe-output" } },
    ]);
  });

  it("rejects unsafe output from a bracket function and from a value type", () => {
    const fromBracket = withUtility({ arbitrary: () => ({ width: "1px}a{b:c" }) });
    expect(fromBracket.compile(["bad[1px]"]).failures).toMatchObject([
      { error: { code: "unsafe-output" } },
    ]);
    const type = { kind: "custom", describe: () => ({ label: "x" }), resolve: () => "}" };
    const fromType = withUtility({
      args: [{ name: "value", types: [type] }],
      properties: ["width"],
    });
    expect(fromType.compile(["bad(x)"]).failures).toMatchObject([
      { error: { code: "unsafe-output" } },
    ]);
  });

  it("accepts ordinary output", () => {
    const croff = withUtility({
      args: [word],
      compile: () => ({
        "--local-name": "1px",
        "-webkit-box-flex": "1",
        width: "calc(100% - 1px) !important",
        background: "url(data:image/png;base64,AAAA)",
        "font-family": '"A;B", serif',
      }),
    });
    expect(croff.compile(["bad(x)"]).failures).toEqual([]);
  });

  const withVariant = (variant: Record<string, unknown>) => () =>
    createCroff({
      plugins: [definePlugin({ name: "croff-plugin-test", variants: { custom: variant } })],
    });

  it.each([
    ["a selector that also matches other elements", { selector: "&:hover, .evil" }],
    ["an unterminated selector", { selector: "&:is(a" }],
    ["an unterminated at-rule", { atRule: "@media (min-width: 1px" }],
    ["a comment", { selector: "& /* a" }],
  ])("rejects a variant with %s", (_label, variant) => {
    expect(withVariant(variant)).toThrow(PluginError);
  });

  it.each([
    ["a selector list", { selector: "&:hover, &:focus" }],
    ["a comma inside a function", { selector: "&:is(a, b)" }],
    ["a comma inside a string", { selector: '&[title="a, b"]' }],
    ["an at-rule list", { atRule: "@media print, (min-width: 1px)" }],
  ])("accepts a variant with %s", (_label, variant) => {
    expect(withVariant(variant)).not.toThrow();
  });
});

describe("theme names that clash with the language", () => {
  const issuesOf = (theme: Record<string, unknown>) =>
    createCroff({ theme: theme as never }, { strict: false }).issues;

  it.each([
    ["spacing", "full", "width(full)"],
    ["spacing", "auto", "width(auto)"],
    ["spacing", "screen", "height(screen)"],
    ["colors", "current", "color(current)"],
    ["colors", "transparent", "bg(transparent)"],
  ])("rejects %s token %s, which would replace a keyword", (scale, name, expression) => {
    const theme = { [scale]: { [name]: scale === "colors" ? "red" : "1px" } };
    expect(() => createCroff({ theme })).toThrow(CroffConfigError);
    expect(issuesOf(theme)).toMatchObject([{ code: "reserved-token", scale, token: name }]);

    const { rules, css } = createCroff({ theme }, { strict: false }).compile([expression]);
    expect(rules).toHaveLength(1);
    expect(css).not.toContain(`--croff-${scale === "colors" ? "color" : scale}-${name}`);
  });

  it("allows those names where no utility has the keyword", () => {
    expect(issuesOf({ radius: { auto: "1px" }, durations: { full: "1s" } })).toEqual([]);
  });

  it("has no clashes in the default theme", () => {
    expect(createCroff().issues).toEqual([]);
  });

  it("reports a breakpoint named after a state variant, instead of throwing", () => {
    const theme = { breakpoints: { hover: "500px" } };
    expect(() => createCroff({ theme })).toThrow(CroffConfigError);
    expect(() => createCroff({ theme })).toThrow(/hover/);
    expect(issuesOf(theme)).toMatchObject([
      { code: "reserved-token", scale: "breakpoints", token: "hover" },
    ]);

    const croff = createCroff({ theme }, { strict: false });
    expect(croff.compile(["hover:gap(4)"]).css).toContain(":hover");
    expect(croff.compile(["hover:gap(4)"]).css).not.toContain("500px");
  });

  it("reports a breakpoint name that can't be written as a variant, instead of throwing", () => {
    const theme = { breakpoints: { Tablet: "500px" } };
    expect(() => createCroff({ theme })).toThrow(CroffConfigError);
    expect(issuesOf(theme)).toMatchObject([
      { code: "invalid-token-name", scale: "breakpoints", token: "Tablet" },
    ]);
    expect(createCroff({ theme }, { strict: false }).compile(["md:gap(4)"]).failures).toEqual([]);
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

  it("reports a utility that fails, even in plain code", async () => {
    await write("src/a.html", '<a class="bad(x)">');
    await write("src/b.ts", "bad(y)\n");
    const type = { kind: "custom", describe: () => ({ label: "x" }), resolve: () => "x" };
    const fails = () => {
      throw new Error("boom");
    };
    const project = await Project.load({
      cwd,
      overrides: {
        plugins: [
          definePlugin({
            name: "croff-plugin-test",
            utilities: {
              bad: { description: "", args: [{ name: "v", types: [type] }], compile: fails },
            },
          }),
        ],
      },
    });
    const { diagnostics } = await project.generate();
    expect(diagnostics.map((d) => [d.severity, d.code, d.expression])).toEqual([
      ["error", "utility-error", "bad(x)"],
      ["warning", "utility-error", "bad(y)"],
    ]);
  });

  it("reports an expression too long to read", async () => {
    await write("src/a.html", `<a class="width[${"1".repeat(600)}px]">`);
    await write("src/b.js", `run(${"1,".repeat(600)})`);
    const { diagnostics } = await (await Project.load({ cwd })).generate();
    expect(diagnostics).toMatchObject([
      { severity: "error", code: "expression-too-long", file: "src/a.html" },
    ]);
    expect(diagnostics[0]!.message.length).toBeLessThan(200);
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

describe("unsupported grouping syntax through a project", () => {
  let cwd: string;
  const write = async (path: string, content: string) => {
    const full = join(cwd, path);
    await mkdir(join(full, ".."), { recursive: true });
    await writeFile(full, content);
  };
  const generate = async () => (await Project.load({ cwd })).generate();

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), "croff-unsupported-"));
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  it("reports an error in a class attribute, and compiles everything else", async () => {
    await write("src/a.html", '<a class="gap(4) hover:(bg(brand),color(white)) md:bg(brand)">');
    const { css, diagnostics } = await generate();
    expect(diagnostics).toMatchObject([
      {
        severity: "error",
        code: "unsupported-group",
        expression: "hover:(bg(brand),color(white))",
        hint: expect.stringContaining('each starting with "hover:"'),
        file: "src/a.html",
        line: 0,
        column: 17,
      },
    ]);
    expect(formatDiagnostic(diagnostics[0]!)).toContain("Variant groups aren't supported.");
    expect(css).toContain(".gap\\(4\\)");
    expect(css).toContain(".md\\:bg\\(brand\\)");
    expect(css).not.toContain("hover");
  });

  it("warns in other strings, and stays silent in code", async () => {
    await write("src/a.ts", 'const a = "md:(gap(4))";\nconst b = x ? y:(z(1)) : 0;\n');
    const { diagnostics } = await generate();
    expect(diagnostics.map((d) => [d.severity, d.code, d.expression])).toEqual([
      ["warning", "unsupported-group", "md:(gap(4))"],
    ]);
  });

  it("reports the real problem when the group also has whitespace", async () => {
    await write("src/a.html", '<a class="hover:(gap(4), gap(8)) gap(12)">');
    const { css, diagnostics } = await generate();
    expect(diagnostics.map((d) => d.code)).toEqual(["unsupported-group"]);
    expect(css).toContain(".gap\\(12\\)");
  });

  it("still reports other whitespace as whitespace", async () => {
    await write("src/a.html", '<a class="width[calc(1px - 2px)]">');
    expect((await generate()).diagnostics.map((d) => d.code)).toEqual(["whitespace"]);
  });

  it("works through a stylesheet directive", () => {
    const { css, failures } = createCroff().processCss(
      "@croff;",
      ["hover:(display(flex))", "display(grid)"],
      { minify: true },
    );
    expect(css).toBe(".display\\(grid\\){display:grid}");
    expect(failures).toMatchObject([{ error: { code: "unsupported-group" } }]);
  });
});
