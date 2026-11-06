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

describe("variant groups", () => {
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
