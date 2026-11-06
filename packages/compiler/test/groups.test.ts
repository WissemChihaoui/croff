import { describe, expect, it } from "vitest";
import { Compiler, type CompileResult } from "@croff/compiler";
import { createRegistry } from "@croff/registry";
import { createTheme } from "@croff/theme";

function makeCompiler() {
  const { theme } = createTheme();
  return new Compiler({ theme, registry: createRegistry(theme) });
}

const compile = (expressions: string[], options?: Parameters<Compiler["compile"]>[1]) =>
  makeCompiler().compile(expressions, options);

/** Everything about the output except which classes a rule selects. */
function shape({ rules }: CompileResult) {
  return rules.map(({ expression, declarations, atRules, tokens }) => ({
    expression,
    declarations,
    atRules,
    tokens,
  }));
}

/** Rule text with selectors removed: what the browser would apply, in order. */
const bodies = (css: string) => css.replace(/^[^{}@:]*[\\.][^{}]*\{/gm, "RULE {");

describe("equivalence with writing the expressions out", () => {
  it.each<[string, string[]]>([
    [
      "hover:(bg(brand),text-color(white),padding(4),radius(lg))",
      ["hover:bg(brand)", "hover:text-color(white)", "hover:padding(4)", "hover:radius(lg)"],
    ],
    [
      "md:(width(1/2),padding(6),gap(4),flex(row))",
      ["md:width(1/2)", "md:padding(6)", "md:gap(4)", "md:flex(row)"],
    ],
    [
      "md:hover:(bg(brand),text-color(white),transform(scale(1.05)))",
      ["md:hover:bg(brand)", "md:hover:text-color(white)", "md:hover:transform(scale(1.05))"],
    ],
    [
      "sm:(padding(4),hover:(bg(brand),text-color(white)))",
      ["sm:padding(4)", "sm:hover:bg(brand)", "sm:hover:text-color(white)"],
    ],
    [
      "lg:(width[calc(100%-var(--w))],bg(alpha(brand,50)),hover:margin[0_auto])",
      ["lg:width[calc(100%-var(--w))]", "lg:bg(alpha(brand,50))", "lg:hover:margin[0_auto]"],
    ],
  ])("%s", (group, expanded) => {
    const grouped = compile([group]);
    const written = compile(expanded);
    expect(grouped.failures).toEqual([]);
    expect(shape(grouped)).toEqual(shape(written));
    expect(bodies(grouped.css)).toBe(bodies(written.css));
  });

  it("gives identical CSS once a selector's class is accounted for", () => {
    const group = "md:(gap(4),hover:bg(brand))";
    const grouped = compile([group]);
    const written = compile(["md:gap(4)", "md:hover:bg(brand)"]);
    // The class in the markup is the whole group, so the selector has to name it.
    const css = grouped.css.replaceAll(
      ".md\\:\\(gap\\(4\\)\\,hover\\:bg\\(brand\\)\\):hover",
      "HOVER",
    );
    const expected = written.css.replaceAll(".md\\:hover\\:bg\\(brand\\):hover", "HOVER");
    expect(css.replaceAll(".md\\:\\(gap\\(4\\)\\,hover\\:bg\\(brand\\)\\)", "PLAIN")).toBe(
      expected.replaceAll(".md\\:gap\\(4\\)", "PLAIN"),
    );
  });
});

describe("selectors", () => {
  it("selects the class as written in the markup", () => {
    expect(compile(["hover:(gap(4))"]).css).toBe(`:root {
  --croff-spacing-4: 1rem;
}

.hover\\:\\(gap\\(4\\)\\):hover {
  gap: var(--croff-spacing-4);
}
`);
  });

  it("applies the variant to each member's rule", () => {
    const { rules } = compile(["md:hover:(gap(4),padding(2))"]);
    expect(rules.map((rule) => rule.selector)).toEqual([
      ".md\\:hover\\:\\(gap\\(4\\)\\,padding\\(2\\)\\):hover",
      ".md\\:hover\\:\\(gap\\(4\\)\\,padding\\(2\\)\\):hover",
    ]);
    expect(rules.map((rule) => rule.atRules)).toEqual([
      ["@media (min-width: 768px)"],
      ["@media (min-width: 768px)"],
    ]);
  });

  it("handles selector templates such as group-hover", () => {
    const { rules } = compile(["group-hover:(gap(4))"]);
    expect(rules[0]!.selector).toBe(".group:hover .group-hover\\:\\(gap\\(4\\)\\)");
  });

  it("escapes digit-leading variants", () => {
    expect(compile(["2xl:(gap(4))"]).css).toContain(".\\32 xl\\:\\(gap\\(4\\)\\)");
  });

  it("can't be used to inject rules", () => {
    const { rules, failures } = compile(["md:(width[1px}body{display:none],gap(4))"]);
    expect(rules.map((rule) => rule.expression)).toEqual(["md:gap(4)"]);
    expect(failures).toHaveLength(1);
  });
});

describe("sharing rules", () => {
  it("merges a group with the same expression written out", () => {
    const { rules, css } = compile(["hover:gap(4)", "hover:(gap(4),padding(2))"]);
    expect(rules).toHaveLength(2);
    const gap = rules.find((rule) => rule.expression === "hover:gap(4)")!;
    expect(gap.classes).toEqual(["hover:gap(4)", "hover:(gap(4),padding(2))"]);
    expect(css.match(/gap: var/g)).toHaveLength(1);
    expect(css).toContain(
      ".hover\\:gap\\(4\\):hover,\n.hover\\:\\(gap\\(4\\)\\,padding\\(2\\)\\):hover {",
    );
  });

  it("merges different groups containing the same expression", () => {
    const { rules } = compile(["md:(hover:gap(4))", "md:hover:(gap(4))"]);
    expect(rules).toHaveLength(1);
    expect(rules[0]!.expression).toBe("md:hover:gap(4)");
    expect(rules[0]!.selectors).toHaveLength(2);
  });

  it("lists a rule's own class first, then the rest in a fixed order", () => {
    const { rules } = compile(["md:(gap(4),gap(8))", "md:gap(4)", "md:(gap(4))"]);
    expect(rules.find((rule) => rule.expression === "md:gap(4)")!.classes).toEqual([
      "md:gap(4)",
      "md:(gap(4))",
      "md:(gap(4),gap(8))",
    ]);
  });

  it("removes repeats inside a group", () => {
    const { rules, css } = compile(["hover:(gap(4),gap(4))"]);
    expect(rules).toHaveLength(1);
    expect(css.match(/gap: var/g)).toHaveLength(1);
  });
});

describe("ordering and determinism", () => {
  it("sorts members with every other rule, as if written out", () => {
    const { rules } = compile([
      "xl:(padding(1))",
      "md:(padding-top(1),hover:padding(1))",
      "padding(1)",
      "md:padding(1)",
    ]);
    expect(rules.map((rule) => rule.expression)).toEqual([
      "padding(1)",
      "md:padding(1)",
      "md:padding-top(1)",
      "md:hover:padding(1)",
      "xl:padding(1)",
    ]);
  });

  it("orders members by the cascade, not by their order in the group", () => {
    const one = compile(["hover:(padding-top(1),padding(1))"]);
    const other = compile(["hover:(padding(1),padding-top(1))"]);
    expect(one.rules.map((rule) => rule.expression)).toEqual(
      other.rules.map((rule) => rule.expression),
    );
    expect(one.rules.map((rule) => rule.expression)).toEqual([
      "hover:padding(1)",
      "hover:padding-top(1)",
    ]);
  });

  it("gives identical output for any input order", () => {
    const input = [
      "md:(gap(4),hover:bg(brand))",
      "hover:bg(brand)",
      "md:hover:(bg(brand),padding(2))",
      "gap(4)",
      "lg:width[10px]",
      "bad:(nope(1))",
      "md:(nope(2),gap(8))",
    ];
    const baseline = compile(input);
    for (let seed = 1; seed < 15; seed++) {
      const shuffled = [...input].sort(() => Math.sin(seed++ * 9301) - 0.3);
      const result = compile(shuffled);
      expect(result.css).toBe(baseline.css);
      expect(result.failures).toEqual(baseline.failures);
    }
  });

  it("gives identical output from a warm compiler", () => {
    const compiler = makeCompiler();
    const first = compiler.compile(["md:(gap(4),gap(8))"]).css;
    expect(compiler.compile(["md:(gap(4),gap(8))"]).css).toBe(first);
    expect(compile(["md:(gap(4),gap(8))"]).css).toBe(first);
  });

  it("doesn't leak a group's classes into later compiles", () => {
    const compiler = makeCompiler();
    compiler.compile(["hover:(gap(4))", "hover:gap(4)"]);
    expect(compiler.compile(["hover:gap(4)"]).rules[0]!.classes).toEqual(["hover:gap(4)"]);
  });

  it("emits the variables its members use", () => {
    const { css } = compile(["md:(gap(4),bg(brand))"]);
    expect(css).toContain("--croff-spacing-4");
    expect(css).toContain("--croff-color-brand");
    expect(css).not.toContain("--croff-color-muted");
  });
});

describe("failures", () => {
  it("compiles valid members and reports invalid ones", () => {
    const { rules, failures } = compile(["hover:(gap(4),nope(1),bg(zzz))"]);
    expect(rules.map((rule) => rule.expression)).toEqual(["hover:gap(4)"]);
    expect(failures).toMatchObject([
      {
        expression: "hover:bg(zzz)",
        phase: "resolve",
        error: { code: "invalid-argument" },
        group: { expression: "hover:(gap(4),nope(1),bg(zzz))", span: { start: 22, end: 29 } },
      },
      {
        expression: "hover:nope(1)",
        phase: "resolve",
        error: { code: "unknown-utility" },
        group: { expression: "hover:(gap(4),nope(1),bg(zzz))", span: { start: 14, end: 21 } },
      },
    ]);
  });

  it("reports a syntax error once, for the whole group", () => {
    const { rules, failures } = compile(["hover:(gap(4),)"]);
    expect(rules).toEqual([]);
    expect(failures).toMatchObject([
      { expression: "hover:(gap(4),)", phase: "parse", error: { code: "empty-group-member" } },
    ]);
  });

  it("reports unknown variants through the registry, naming the member", () => {
    const { failures } = compile(["hovr:(gap(4))"]);
    expect(failures).toMatchObject([
      { expression: "hovr:gap(4)", error: { code: "unknown-variant" } },
    ]);
  });

  it("suggests the expanded correction", () => {
    const { failures } = compile(["md:(pad(4))"]);
    expect(failures[0]).toMatchObject({ error: { suggestion: "md:padding(4)" } });
  });

  it("has no group information on an ordinary failure", () => {
    const [failure] = compile(["nope(1)"]).failures;
    expect(failure).not.toHaveProperty("group");
  });

  it("refuses a group passed directly to resolve", () => {
    const result = makeCompiler().resolve("hover:(gap(4))");
    expect(!result.ok && result.failure.error.code).toBe("unexpected-group");
  });
});

describe("minification and source maps", () => {
  it("joins selectors compactly", () => {
    expect(
      compile(["hover:gap(4)", "hover:(gap(4))"], { minify: true, variables: "none" }).css,
    ).toBe(".hover\\:gap\\(4\\):hover,.hover\\:\\(gap\\(4\\)\\):hover{gap:var(--croff-spacing-4)}");
  });

  it("indents selector lists inside at-rules", () => {
    expect(compile(["md:gap(4)", "md:(gap(4))"], { variables: "none" }).css).toBe(
      `@media (min-width: 768px) {
  .md\\:gap\\(4\\),
  .md\\:\\(gap\\(4\\)\\) {
    gap: var(--croff-spacing-4);
  }
}
`,
    );
  });

  it("maps each rule to its member's position in the group", () => {
    const { mappings } = makeCompiler().compile(
      [
        {
          expression: "hover:(display(flex),position(fixed))",
          location: { file: "a.html", line: 3, column: 10 },
        },
      ],
      { sourceMap: true },
    );
    expect(mappings!.map((mapping) => [mapping.sourceLine, mapping.sourceColumn])).toEqual([
      [3, 17],
      [3, 31],
    ]);
  });
});

describe("color and scale", () => {
  it("compile the variant group examples as they were first written", () => {
    expect(compile(["hover:(bg(brand),color(white),padding(4),radius(lg))"]).failures).toEqual([]);
    expect(compile(["md:hover:(bg(brand),color(white),scale(105))"]).failures).toEqual([]);
    expect(compile(["sm:(padding(4),hover:(bg(brand),color(white)))"]).failures).toEqual([]);
  });

  it.each<[string, string[]]>([
    ["hover:(color(white),scale(105))", ["hover:color(white)", "hover:scale(105)"]],
    ["md:(color(brand),scale(95))", ["md:color(brand)", "md:scale(95)"]],
    ["md:hover:(color(brand),scale(110))", ["md:hover:color(brand)", "md:hover:scale(110)"]],
    [
      "sm:(color(white),hover:(color(brand),scale(105)),focus:scale(95))",
      ["sm:color(white)", "sm:hover:color(brand)", "sm:hover:scale(105)", "sm:focus:scale(95)"],
    ],
    ["lg:(color[#ff00aa],scale[1.2,0.8])", ["lg:color[#ff00aa]", "lg:scale[1.2,0.8]"]],
  ])("%s matches the written-out form", (group, expanded) => {
    const grouped = compile([group]);
    const written = compile(expanded);
    expect(grouped.failures).toEqual([]);
    expect(shape(grouped)).toEqual(shape(written));
  });

  it("apply responsive and state variants", () => {
    const { css } = compile(["md:color(white)", "hover:scale(105)", "md:hover:scale(110)"]);
    expect(css).toContain(".hover\\:scale\\(105\\):hover {\n  transform: scale(1.05);");
    expect(css).toContain(
      "@media (min-width: 768px) {\n  .md\\:color\\(white\\) {\n    color: var(--croff-color-white);",
    );
    expect(css).toContain(".md\\:hover\\:scale\\(110\\):hover {\n    transform: scale(1.1);");
  });

  it("emit only the tokens they use", () => {
    const { css } = compile(["color(brand)", "scale(105)"]);
    expect(css).toContain("--croff-color-brand");
    expect(css).not.toContain("--croff-color-white");
  });

  it("respect a custom theme", () => {
    const { theme } = createTheme([{ colors: { accent: "#123456", white: null } }]);
    const compiler = new Compiler({ theme, registry: createRegistry(theme) });
    expect(compiler.compile(["color(accent)"]).css).toContain("--croff-color-accent: #123456;");
    expect(compiler.compile(["color(white)"]).failures).toMatchObject([
      { error: { code: "invalid-argument" } },
    ]);
  });

  it("win over their longer forms, in any written order", () => {
    const names = (rules: CompileResult["rules"]) => rules.map((rule) => rule.expression);
    expect(names(compile(["color(white)", "text-color(brand)"]).rules)).toEqual([
      "text-color(brand)",
      "color(white)",
    ]);
    expect(names(compile(["scale(105)", "transform(rotate(5deg))"]).rules)).toEqual([
      "transform(rotate(5deg))",
      "scale(105)",
    ]);
  });

  it("report invalid group members one by one, and compile the rest", () => {
    const { rules, failures } = compile(["hover:(color(nope),scale(105),scale(1.05))"]);
    expect(rules.map((rule) => rule.expression)).toEqual(["hover:scale(105)"]);
    expect(failures.map((failure) => [failure.expression, failure.error.code])).toEqual([
      ["hover:color(nope)", "invalid-argument"],
      ["hover:scale(1.05)", "invalid-argument"],
    ]);
  });

  it("are rejected with their whole group by a syntax error", () => {
    const { rules, failures } = compile(["hover:(color(white),scale(105),)"]);
    expect(rules).toEqual([]);
    expect(failures).toMatchObject([{ phase: "parse", error: { code: "empty-group-member" } }]);
  });
});
