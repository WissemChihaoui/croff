import { describe, expect, it } from "vitest";
import { Compiler, escapeCssIdentifier, minifyCss, type CompileOptions } from "@croff/compiler";
import { createRegistry } from "@croff/registry";
import { createTheme, type ThemeConfig } from "@croff/theme";

function makeCompiler(themeConfig?: ThemeConfig) {
  const { theme } = createTheme(themeConfig ? [themeConfig] : []);
  return new Compiler({ theme, registry: createRegistry(theme) });
}

const css = (expressions: string[], options?: CompileOptions) =>
  makeCompiler().compile(expressions, options).css;

describe("CSS generation", () => {
  it("generates the variable and rule", () => {
    expect(css(["gap(4)"])).toBe(`:root {
  --croff-spacing-4: 1rem;
}

.gap\\(4\\) {
  gap: var(--croff-spacing-4);
}
`);
  });

  it("only emits used tokens", () => {
    const output = css(["bg(brand)"]);
    expect(output).toContain("--croff-color-brand");
    expect(output).not.toContain("--croff-color-muted");
    expect(output).not.toContain("--croff-spacing");
  });

  it("can emit all or no variables", () => {
    expect(css(["gap(4)"], { variables: "all" })).toContain("--croff-color-muted");
    expect(css(["gap(4)"], { variables: "none" })).not.toContain(":root");
  });

  it("omits :root when no token is used", () => {
    expect(css(["display(flex)"])).toBe(".display\\(flex\\) {\n  display: flex;\n}\n");
  });

  it("emits an empty string for no input", () => {
    expect(css([])).toBe("");
  });

  it("can emit each layer alone", () => {
    expect(css(["gap(4)"], { layers: ["theme"] })).not.toContain(".gap");
    expect(css(["gap(4)"], { layers: ["utilities"] })).not.toContain(":root");
    expect(css([], { layers: ["reset"] })).toContain("box-sizing: border-box");
  });

  it("honors a custom theme", () => {
    const { css: output } = makeCompiler({
      colors: { brand: "#A8FF32" },
      spacing: { 7: "9px" },
    }).compile(["bg(brand)", "gap(7)"]);
    expect(output).toContain("--croff-color-brand: #a8ff32;");
    expect(output).toContain("--croff-spacing-7: 9px;");
  });
});

describe("responsive rules", () => {
  it("wraps rules in media queries", () => {
    expect(css(["md:display(block)"])).toBe(`@media (min-width: 768px) {
  .md\\:display\\(block\\) {
    display: block;
  }
}
`);
  });

  it("orders breakpoints narrowest first, after base rules", () => {
    const output = css([
      "xl:width(full)",
      "width(1/2)",
      "sm:width(1/3)",
      "2xl:width(auto)",
      "md:width(1/4)",
    ]);
    const order = [
      "width\\(1\\/2\\)",
      "@media (min-width: 640px)",
      "@media (min-width: 768px)",
      "@media (min-width: 1280px)",
      "@media (min-width: 1536px)",
    ];
    const positions = order.map((part) => output.indexOf(part));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("orders custom breakpoints by width, not name or declaration", () => {
    const { rules } = makeCompiler({ breakpoints: { huge: "2000px", tiny: "100px" } }).compile([
      "huge:gap(1)",
      "tiny:gap(1)",
      "md:gap(1)",
    ]);
    expect(rules.map((r) => r.expression)).toEqual(["tiny:gap(1)", "md:gap(1)", "huge:gap(1)"]);
  });

  it("shares a media block between rules", () => {
    const output = css(["md:gap(4)", "md:gap(8)"]);
    expect(output.match(/@media/g)).toHaveLength(1);
  });

  it("nests stacked at-rules", () => {
    const output = css(["md:lg:gap(4)"]);
    expect(output).toContain(
      "@media (min-width: 768px) {\n  @media (min-width: 1024px) {\n    .md",
    );
  });
});

describe("state variants", () => {
  it.each([
    ["hover:gap(4)", ".hover\\:gap\\(4\\):hover"],
    ["focus:gap(4)", ".focus\\:gap\\(4\\):focus"],
    ["active:gap(4)", ".active\\:gap\\(4\\):active"],
    ["disabled:gap(4)", ".disabled\\:gap\\(4\\):disabled"],
    ["focus-within:gap(4)", ".focus-within\\:gap\\(4\\):focus-within"],
    ["group-hover:gap(4)", ".group:hover .group-hover\\:gap\\(4\\)"],
  ])("%s selects %s", (expression, selector) => {
    expect(makeCompiler().compile([expression]).rules[0]!.selector).toBe(selector);
  });

  it("composes variants", () => {
    const [rule] = makeCompiler().compile(["md:hover:focus:bg(brand)"]).rules;
    expect(rule!.selector).toBe(".md\\:hover\\:focus\\:bg\\(brand\\):hover:focus");
    expect(rule!.atRules).toEqual(["@media (min-width: 768px)"]);
  });

  it("composes group-hover with hover", () => {
    const [rule] = makeCompiler().compile(["group-hover:hover:gap(4)"]).rules;
    expect(rule!.selector).toBe(".group:hover .group-hover\\:hover\\:gap\\(4\\):hover");
  });

  it("orders states so that later interactions win", () => {
    const { rules } = makeCompiler().compile([
      "disabled:gap(1)",
      "active:gap(1)",
      "focus:gap(1)",
      "hover:gap(1)",
      "gap(1)",
    ]);
    expect(rules.map((r) => r.expression)).toEqual([
      "gap(1)",
      "hover:gap(1)",
      "focus:gap(1)",
      "active:gap(1)",
      "disabled:gap(1)",
    ]);
  });

  it("orders general utilities before specific ones", () => {
    const { rules } = makeCompiler().compile(["padding-top(1)", "padding-x(1)", "padding(1)"]);
    expect(rules.map((r) => r.expression)).toEqual([
      "padding(1)",
      "padding-x(1)",
      "padding-top(1)",
    ]);
  });
});

describe("deduplication and determinism", () => {
  it("removes duplicates", () => {
    const { rules, css: output } = makeCompiler().compile(["gap(4)", "gap(4)", "gap(4)"]);
    expect(rules).toHaveLength(1);
    expect(output.match(/\.gap/g)).toHaveLength(1);
  });

  it("gives identical output for any input order", () => {
    const input = [
      "bg(brand)",
      "md:hover:bg(brand-dark)",
      "gap(4)",
      "lg:width(1/3)",
      "padding(2)",
      "hover:text-color(light)",
      "width[calc(100%-1px)]",
      "sm:display(none)",
      "focus:ring(2)",
      "padding-x(1)",
    ];
    const baseline = css(input);
    for (let seed = 1; seed < 20; seed++) {
      const shuffled = [...input].sort(() => Math.sin(seed++ * 9301) - 0.3);
      expect(css(shuffled)).toBe(baseline);
    }
  });

  it("gives identical output across compiler instances and cached runs", () => {
    const compiler = makeCompiler();
    const first = compiler.compile(["gap(4)", "md:gap(8)"]).css;
    expect(compiler.compile(["md:gap(8)", "gap(4)"]).css).toBe(first);
    expect(makeCompiler().compile(["gap(4)", "md:gap(8)"]).css).toBe(first);
  });

  it("memoizes resolution", () => {
    const compiler = makeCompiler();
    expect(compiler.resolve("gap(4)")).toBe(compiler.resolve("gap(4)"));
  });

  it("does not mutate variable order by first use", () => {
    expect(css(["bg(brand)", "bg(muted)"])).toBe(css(["bg(muted)", "bg(brand)"]));
  });
});

describe("arbitrary values", () => {
  it("handles nested functions end to end", () => {
    expect(css(["width[calc(100%-var(--sidebar-width))]"])).toBe(
      `.width\\[calc\\(100\\%-var\\(--sidebar-width\\)\\)\\] {
  width: calc(100% - var(--sidebar-width));
}
`,
    );
  });

  it("handles the height example", () => {
    expect(css(["height[calc(100vh-80px)]"])).toContain("height: calc(100vh - 80px);");
  });

  it("turns underscores into spaces", () => {
    expect(css(["margin[0_auto]"])).toContain("margin: 0 auto;");
  });

  it("applies variants", () => {
    const output = css(["lg:hover:width[320px]"]);
    expect(output).toContain("@media (min-width: 1024px)");
    expect(output).toContain(".lg\\:hover\\:width\\[320px\\]:hover");
    expect(output).toContain("width: 320px;");
  });
});

describe("CSS escaping", () => {
  it("matches the CSS.escape algorithm", () => {
    expect(escapeCssIdentifier("a(b)")).toBe("a\\(b\\)");
    expect(escapeCssIdentifier("md:x/y")).toBe("md\\:x\\/y");
    expect(escapeCssIdentifier("2xl:a")).toBe("\\32 xl\\:a");
    expect(escapeCssIdentifier("-")).toBe("\\-");
    expect(escapeCssIdentifier("-1")).toBe("-\\31 ");
    expect(escapeCssIdentifier("a.b%c#d!e")).toBe("a\\.b\\%c\\#d\\!e");
    expect(escapeCssIdentifier("a'b\"c")).toBe("a\\'b\\\"c");
    expect(escapeCssIdentifier("é_x-y")).toBe("é_x-y");
    expect(escapeCssIdentifier("a\nb")).toBe("a\\a b");
    expect(escapeCssIdentifier("a\\b")).toBe("a\\\\b");
  });

  it("escapes digit-leading variants in selectors", () => {
    expect(css(["2xl:gap(4)"])).toContain(".\\32 xl\\:gap\\(4\\)");
  });

  it("escapes everything needed in fractions", () => {
    expect(css(["width(1/2)"])).toContain(".width\\(1\\/2\\) {");
  });

  it("escapes quotes in bracket values", () => {
    expect(css(["font['Inter',serif]"])).toContain(".font\\[\\'Inter\\'\\,serif\\]");
  });

  it("cannot be used to inject rules", () => {
    const { rules, failures } = makeCompiler().compile([
      "width[1px}body{display:none]",
      "width[1px;x:y]",
    ]);
    expect(rules).toEqual([]);
    expect(failures).toHaveLength(2);
  });
});

describe("failures", () => {
  it("separates syntax and resolution failures", () => {
    const { failures, rules } = makeCompiler().compile(["gap(4", "nope(1)", "gap(4)"]);
    expect(rules).toHaveLength(1);
    expect(failures).toMatchObject([
      { expression: "gap(4", phase: "parse", error: { code: "unterminated-call" } },
      { expression: "nope(1)", phase: "resolve", error: { code: "unknown-utility" } },
    ]);
  });
});

describe("minification", () => {
  it("produces compact output", () => {
    expect(css(["gap(4)", "md:hover:gap(8)"], { minify: true })).toBe(
      ":root{--croff-spacing-4:1rem;--croff-spacing-8:2rem}" +
        ".gap\\(4\\){gap:var(--croff-spacing-4)}" +
        "@media (min-width:768px){.md\\:hover\\:gap\\(8\\):hover{gap:var(--croff-spacing-8)}}",
    );
  });

  it("minifies hand-written CSS without breaking strings or url()", () => {
    const input = `/* note */
      a   >  b {
        content: "a  /* b */  c";
        background: url(a  b.png);
        margin: 0 auto ;
      }
      @media (min-width: 1px) { c { d: e; } }`;
    expect(minifyCss(input)).toBe(
      'a > b{content:"a  /* b */  c";background:url(a  b.png);margin:0 auto}@media (min-width:1px){c{d:e}}',
    );
  });
});

describe("source maps", () => {
  it("is omitted unless requested", () => {
    expect(makeCompiler().compile(["gap(4)"]).map).toBeUndefined();
  });

  it("maps rules to the first use of their expression", () => {
    const { map } = makeCompiler().compile(
      [
        { expression: "display(flex)", location: { file: "src/a.html", line: 3, column: 10 } },
        { expression: "display(flex)", location: { file: "src/b.html", line: 9, column: 1 } },
      ],
      { sourceMap: true, file: "out.css" },
    );
    expect(map).toMatchObject({ version: 3, file: "out.css", sources: ["src/a.html"], names: [] });
    // Generated 0:0 → source 0, line 3, column 10.
    expect(map!.mappings).toBe("AAGU");
  });

  it("tracks lines across rules", () => {
    const { map } = makeCompiler().compile(
      [
        { expression: "display(flex)", location: { file: "a", line: 0, column: 0 } },
        { expression: "position(fixed)", location: { file: "a", line: 1, column: 0 } },
      ],
      { sourceMap: true },
    );
    // Each rule is 3 lines plus a separating blank line.
    expect(map!.mappings.split(";")).toEqual(["AAAA", "", "", "", "AACA"]);
  });
});

describe("snapshots", () => {
  it("matches the reference stylesheet", () => {
    expect(
      css([
        "flex(row)",
        "align(center)",
        "justify(between)",
        "gap(4)",
        "padding(6)",
        "radius(xl)",
        "bg(brand)",
        "width(full)",
        "md:width(1/2)",
        "lg:width(1/3)",
        "hover:bg(brand-dark)",
        "focus:ring(2)",
        "disabled:opacity(50)",
        "width[320px]",
        "height[calc(100vh-80px)]",
        "bg[#121212]",
        "display(grid)",
        "columns(3)",
        "group-hover:text-color(brand)",
      ]),
    ).toMatchSnapshot();
  });
});
