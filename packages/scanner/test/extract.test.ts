import { describe, expect, it } from "vitest";
import { extractCandidates } from "@croff/scanner/extract";

const expressions = (source: string) =>
  extractCandidates(source).candidates.map((c) => c.expression);

describe("HTML", () => {
  it("extracts from double and single quoted attributes", () => {
    expect(expressions(`<div class="flex(row) gap(4)"></div><p class='bg(brand)'></p>`)).toEqual([
      "flex(row)",
      "gap(4)",
      "bg(brand)",
    ]);
  });

  it("handles multi-line attributes", () => {
    const source = `<div class="
      flex(row)
      align(center)
    ">`;
    expect(expressions(source)).toEqual(["flex(row)", "align(center)"]);
  });

  it("handles unquoted attributes", () => {
    expect(expressions("<div class=flex(row)>x</div>")).toEqual(["flex(row)"]);
  });

  it("extracts variants and bracket values", () => {
    expect(
      expressions(
        `<a class="md:hover:bg(brand) width[calc(100%-var(--sidebar-width))] height[calc(100vh-80px)]">`,
      ),
    ).toEqual([
      "md:hover:bg(brand)",
      "width[calc(100%-var(--sidebar-width))]",
      "height[calc(100vh-80px)]",
    ]);
  });

  it("extracts bracket values containing quotes", () => {
    expect(expressions(`<p class="font['Inter',serif] x">`)).toEqual(["font['Inter',serif]"]);
  });

  it("is not confused by apostrophes in text", () => {
    expect(expressions(`<p>Don't</p><span class="gap(4)">it's</span>`)).toEqual(["gap(4)"]);
  });

  it("ignores plain class names", () => {
    expect(expressions(`<div class="card group flex active"></div>`)).toEqual([]);
  });
});

describe("JSX and JavaScript", () => {
  it("extracts from className strings and expressions", () => {
    const source = `<div className="flex(row)" />
      <div className={active ? "bg(brand)" : "bg(dark)"} />
      <div className={\`gap(4) \${open ? "width(full)" : ""}\`} />`;
    expect(expressions(source)).toEqual([
      "flex(row)",
      "bg(brand)",
      "bg(dark)",
      "gap(4)",
      "width(full)",
    ]);
  });

  it("extracts from helper calls and plain strings", () => {
    const source = `const a = cx("gap(1)", cond && "gap(2)", { "gap(3)": x });
      const STYLES = "padding(4) margin(2)";`;
    expect(expressions(source)).toEqual(["gap(1)", "gap(2)", "gap(3)", "padding(4)", "margin(2)"]);
  });

  it("does not match method calls or code that isn't delimited", () => {
    const source = `foo.width(10); el.padding(4);
      const v = width(10);
      return height(x)+1;
      { run(1); }`;
    expect(expressions(source)).toEqual([]);
  });

  it("keeps delimited code, flagged so that failures in it stay silent", () => {
    expect(extractCandidates("if(ok) {").candidates).toMatchObject([
      { expression: "if(ok)", context: "code" },
    ]);
  });

  it("does not stop at a closing paren of an enclosing call", () => {
    expect(expressions(`f("gap(4)")`)).toEqual(["gap(4)"]);
  });
});

describe("contexts", () => {
  const context = (source: string, expression: string) =>
    extractCandidates(source).candidates.find((c) => c.expression === expression)?.context;

  it("identifies class attributes", () => {
    expect(context(`<div class="nope(1)">`, "nope(1)")).toBe("class");
    expect(context(`<div className="a b nope(1)">`, "nope(1)")).toBe("class");
    expect(context(`<div :class="nope(1)">`, "nope(1)")).toBe("class");
    expect(context(`<div className={x ? "nope(1)" : ""}>`, "nope(1)")).toBe("class");
    expect(context("const a = cx('nope(1)')", "nope(1)")).toBe("class");
    expect(context("<div class=nope(1)>", "nope(1)")).toBe("class");
  });

  it("identifies other strings and code", () => {
    expect(context(`const a = "nope(1)"`, "nope(1)")).toBe("string");
    expect(context(`nope(1)\n`, "nope(1)")).toBe("code");
  });

  it("promotes the context when a repeat is more specific", () => {
    expect(context(`const a = "x(1)"; <div class="x(1)">`, "x(1)")).toBe("class");
  });

  it("does not treat code in JSX expressions as class names", () => {
    expect(context(`<div className={x ? foo(y) : "a(1)"}>`, "foo(y)")).toBe("code");
  });
});

describe("duplicates and locations", () => {
  it("reports each expression once, at its first location", () => {
    const { candidates } = extractCandidates(`<a class="gap(4)">\n  <b class="x gap(4)">`);
    expect(candidates).toEqual([{ expression: "gap(4)", context: "class", line: 0, column: 10 }]);
  });

  it("gives accurate lines and columns", () => {
    const { candidates } = extractCandidates(`<a\n  class="m(1) gap(4)">`);
    expect(candidates.find((c) => c.expression === "gap(4)")).toMatchObject({
      line: 1,
      column: 14,
    });
  });
});

describe("dynamic expressions", () => {
  it("does not extract interpolated names, and reports them", () => {
    const { candidates, dynamic } = extractCandidates("<div className={`bg(${color})`} />");
    expect(candidates).toEqual([]);
    expect(dynamic).toMatchObject([{ text: "bg(${color})", context: "class" }]);
  });

  it("does not report plain concatenation, which cannot be detected", () => {
    const { candidates, dynamic } = extractCandidates(`const a = "bg(" + color + ")";`);
    expect(candidates).toEqual([]);
    expect(dynamic).toEqual([]);
  });

  it("still finds complete expressions in the interpolation", () => {
    const { candidates } = extractCandidates(
      '`bg(${active ? "brand" : "dark"}) ${on ? "gap(4)" : ""}`',
    );
    expect(candidates.map((c) => c.expression)).toEqual(["gap(4)"]);
  });
});

describe("broken expressions", () => {
  it("reports whitespace inside a class attribute", () => {
    const { candidates, broken } = extractCandidates(
      `<div class="width[calc(100% - 1px)] gap(4)">`,
    );
    expect(broken).toMatchObject([{ text: "width[calc(100% - 1px)] gap(4)", context: "class" }]);
    expect(candidates.map((c) => c.expression)).toContain("gap(4)");
  });

  it("stays silent outside of class contexts", () => {
    expect(extractCandidates("call(a, b)").broken).toEqual([]);
  });
});

describe("Svelte class directives", () => {
  const contexts = (source: string) =>
    extractCandidates(source).candidates.map((c) => [c.expression, c.context]);

  it("reads the expression after the prefix, as a class", () => {
    expect(
      contexts("<a class:gap(4)={on} class:hover:bg(brand)={on} class:width[1px]={on}>"),
    ).toEqual([
      ["gap(4)", "class"],
      ["hover:bg(brand)", "class"],
      ["width[1px]", "class"],
    ]);
  });

  it("points at the expression, not the prefix", () => {
    expect(extractCandidates("<a class:gap(4)={on}>").candidates[0]).toMatchObject({ column: 9 });
  });

  it("doesn't mistake other attributes for it", () => {
    expect(
      expressions('<a data-class:gap(4)={on} xclass:gap(8)={on} class:list={["gap(12)"]}>'),
    ).toEqual(["gap(12)"]);
  });

  it("only treats = as an ending after the prefix", () => {
    expect(expressions("<a gap(4)={on}>")).toEqual([]);
  });
});

describe("unusual endings", () => {
  it("accepts an unquoted value that ends a self-closing tag", () => {
    expect(extractCandidates("<img class=gap(4)/>").candidates).toMatchObject([
      { expression: "gap(4)", context: "class" },
    ]);
  });

  it("still rejects a slash that isn't closing a tag", () => {
    expect(expressions('"gap(4)/2"')).toEqual([]);
    expect(expressions('"gap(4)/"')).toEqual([]);
  });

  it.each([
    [String.raw`"gap(4)\n"`],
    [String.raw`"gap(4)\t"`],
    [String.raw`"gap(4)\r\n"`],
    [String.raw`"gap(4)\f"`],
  ])("accepts an expression before the whitespace escape in %s", (source) => {
    expect(expressions(source)).toEqual(["gap(4)"]);
  });

  it("accepts expressions after and between whitespace escapes", () => {
    expect(expressions(String.raw`"\ngap(4)\n\thover:bg(brand)\n"`)).toEqual([
      "gap(4)",
      "hover:bg(brand)",
    ]);
    expect(expressions(String.raw`"foo\ngap(4)"`)).toEqual(["gap(4)"]);
  });

  it("accepts an expression before an escaped quote", () => {
    expect(expressions(String.raw`const html = "<a class=\"gap(4) bg(brand)\">"`)).toEqual([
      "gap(4)",
      "bg(brand)",
    ]);
  });

  it("still rejects other escapes", () => {
    expect(expressions(String.raw`"gap(4)\d"`)).toEqual([]);
    expect(expressions(String.raw`"x\dgap(4)"`)).toEqual([]);
  });
});

describe("very long expressions", () => {
  const long = `width[${"1".repeat(600)}px]`;

  it("reports one in a class, without quoting all of it", () => {
    const { candidates, broken } = extractCandidates(`<a class="${long} gap(4)">`);
    expect(candidates.map((c) => c.expression)).toEqual(["gap(4)"]);
    expect(broken).toMatchObject([{ tooLong: true, context: "class", column: 10 }]);
    expect(broken[0]!.text.length).toBeLessThan(100);
  });

  it("stays silent outside a class, where it's probably minified code", () => {
    expect(extractCandidates(`run(${"1,".repeat(600)})`).broken).toEqual([]);
    expect(extractCandidates(`"${long}"`).broken).toEqual([]);
  });

  it("accepts one exactly at the limit", () => {
    const fits = `width[${"1".repeat(512 - "width[px]".length)}px]`;
    expect(expressions(`<a class="${fits}">`)).toEqual([fits]);
  });
});

describe("tagged templates", () => {
  const contexts = (source: string, classFunctions?: string[]) =>
    extractCandidates(source, classFunctions ? { classFunctions } : {}).candidates.map((c) => [
      c.expression,
      c.context,
    ]);

  it("treats every token in a class function's template as a class", () => {
    expect(contexts("cx`gap(4) bg(brand)\n  nope(1)`")).toEqual([
      ["gap(4)", "class"],
      ["bg(brand)", "class"],
      ["nope(1)", "class"],
    ]);
  });

  it("honors configured function names", () => {
    expect(contexts("tw`gap(4) bg(brand)`", ["tw"])).toEqual([
      ["gap(4)", "class"],
      ["bg(brand)", "class"],
    ]);
  });

  it("carries on after an interpolation", () => {
    expect(contexts('cx`gap(4) ${on ? "bg(brand)" : ""} padding(2)` nope(1)')).toEqual([
      ["gap(4)", "class"],
      ["bg(brand)", "class"],
      ["padding(2)", "class"],
      ["nope(1)", "code"],
    ]);
  });

  it("ignores other tags", () => {
    expect(contexts("html`gap(4) bg(brand)`")).toEqual([
      ["gap(4)", "string"],
      ["bg(brand)", "code"],
    ]);
  });
});

describe("arbitrary properties", () => {
  it("finds them in a class, with or without variants", () => {
    expect(
      extractCandidates('<a class="[float:left] md:hover:[clear:both]">').candidates,
    ).toMatchObject([
      { expression: "[float:left]", context: "class" },
      { expression: "md:hover:[clear:both]", context: "class" },
    ]);
  });

  it("finds them in strings and class helpers", () => {
    expect(expressions('const a = "[float:left]"; cx("[clear:both]")')).toEqual([
      "[float:left]",
      "[clear:both]",
    ]);
  });

  it("ignores them in plain code, where brackets mean something else", () => {
    expect(expressions("interface A { [key:string]: number }\nconst b = x ? [a:b] : c;")).toEqual(
      [],
    );
    expect(expressions("const a = { foo:[bar:baz] };\n[note:hello]\n")).toEqual([]);
  });

  it("still reads an array of class names", () => {
    expect(expressions('<a class={["gap(4)", "[float:left]"]}>')).toEqual([
      "gap(4)",
      "[float:left]",
    ]);
  });

  it("ignores brackets without a property", () => {
    expect(expressions('"[1,2]" "[foo]" "[:x]" "[1:2]"')).toEqual([]);
  });
});

describe("robustness", () => {
  it("handles empty, huge and unbalanced input", () => {
    expect(expressions("")).toEqual([]);
    expect(expressions("a(".repeat(5000))).toEqual([]);
    expect(expressions(`class="${"x".repeat(100_000)}"`)).toEqual([]);
    expect(expressions(`<div class="unterminated`)).toEqual([]);
  });

  it("handles comments in class expressions", () => {
    expect(expressions(`<a className={/* "x" */ "gap(1)" // "y"\n}>`)).toContain("gap(1)");
  });

  it("supports custom class functions", () => {
    const { candidates } = extractCandidates(`tw("x(1)")`, { classFunctions: ["tw"] });
    expect(candidates[0]!.context).toBe("class");
  });
});

describe("unsupported grouping syntax, which must reach the parser to be reported", () => {
  it("reads an entire group as one candidate", () => {
    expect(expressions('<div class="hover:(bg(brand),padding(4),radius(lg)) gap(4)">')).toEqual([
      "hover:(bg(brand),padding(4),radius(lg))",
      "gap(4)",
    ]);
  });

  it("does not also report the group's members", () => {
    expect(expressions('<a class="md:(gap(4),hover:(bg(brand)))">')).toEqual([
      "md:(gap(4),hover:(bg(brand)))",
    ]);
  });

  it("handles combined variants, nesting, functions and arbitrary values", () => {
    const groups = [
      "md:hover:(bg(brand),padding(4))",
      "sm:(padding(4),hover:(bg(brand),gap(4)))",
      "lg:(bg(alpha(brand,50)),width[calc(100%-var(--w))],font['a,b',serif])",
      "2xl:(gap(4))",
    ];
    expect(expressions(`<a class="${groups.join(" ")}">`)).toEqual(groups);
  });

  it("finds groups in JSX, helpers and plain strings", () => {
    const source = `<a className="hover:(gap(1),gap(2))" />
      <b className={on ? "md:(gap(3))" : "lg:(gap(4))"} />
      const a = cx("xl:(gap(5))", { "sm:(gap(6))": x });
      const b = "focus:(gap(8))";`;
    expect(expressions(source)).toEqual([
      "hover:(gap(1),gap(2))",
      "md:(gap(3))",
      "lg:(gap(4))",
      "xl:(gap(5))",
      "sm:(gap(6))",
      "focus:(gap(8))",
    ]);
  });

  it("identifies the context, for strict diagnostics in class attributes", () => {
    const { candidates } = extractCandidates('<a class="md:(nope(1))">');
    expect(candidates).toMatchObject([{ context: "class", column: 10 }]);
  });

  it("reports whitespace inside a group as broken", () => {
    const { candidates, broken } = extractCandidates('<a class="hover:(gap(4), gap(8)) gap(12)">');
    expect(broken).toMatchObject([{ context: "class" }]);
    expect(candidates.map((c) => c.expression)).toContain("gap(12)");
    expect(candidates.map((c) => c.expression)).not.toContain("hover:(gap(4),");
  });

  it("reports a group spread over lines as broken", () => {
    const { broken } = extractCandidates(`<a class="hover:(
      gap(4)
    )">`);
    expect(broken).toHaveLength(1);
  });

  it("reports interpolation inside a group as dynamic", () => {
    const { candidates, dynamic } = extractCandidates(
      "<a className={`hover:(bg(${c}),gap(4))`} />",
    );
    expect(dynamic).toMatchObject([{ context: "class" }]);
    expect(candidates).toEqual([]);
  });

  it("ignores things that merely resemble one", () => {
    expect(expressions("foo.bar:(baz(1))")).toEqual([]);
    expect(expressions("x ? a:(b(1)):c")).toEqual([]);
    expect(expressions('"Note:(see below)"')).toEqual([]);
  });

  it("leaves unbalanced groups out", () => {
    expect(expressions('<a class="hover:(gap(4)">')).toEqual([]);
  });
});
