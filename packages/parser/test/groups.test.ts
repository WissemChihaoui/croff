import { describe, expect, it } from "vitest";
import {
  expand,
  formatParseError,
  parse,
  type ExpressionNode,
  type GroupNode,
  type ParseErrorCode,
} from "@croff/parser";

function ok(source: string): ExpressionNode {
  const result = parse(source);
  if (!result.ok) throw new Error(formatParseError(result.error, source));
  return result.node;
}

function group(source: string): GroupNode {
  const node = ok(source);
  if (node.type !== "group") throw new Error(`"${source}" didn't parse as a group`);
  return node;
}

const expressions = (source: string) => expand(ok(source)).map((item) => item.expression);

function errorCode(source: string): ParseErrorCode {
  const result = parse(source);
  if (result.ok) throw new Error(`Expected "${source}" to fail`);
  return result.error.code;
}

describe("parsing groups", () => {
  it("produces a structured node", () => {
    const node = group("hover:(bg(brand),padding(4))");
    expect(node.source).toBe("hover:(bg(brand),padding(4))");
    expect(node.variants.map((variant) => variant.name)).toEqual(["hover"]);
    expect(node.members.map((member) => member.type)).toEqual(["utility", "utility"]);
    expect(node.members[0]).toMatchObject({
      name: "bg",
      source: "bg(brand)",
      arguments: [{ type: "word", value: "brand" }],
    });
  });

  it("records spans relative to the whole expression", () => {
    const node = group("hover:(bg(brand),padding(4))");
    expect(node.span).toEqual({ start: 0, end: 28 });
    expect(node.members[0]!.span).toEqual({ start: 7, end: 16 });
    expect(node.members[1]!.span).toEqual({ start: 17, end: 27 });
  });

  it("nests", () => {
    const node = group("sm:(padding(4),hover:(bg(brand),gap(4)))");
    const inner = node.members[1] as GroupNode;
    expect(inner.type).toBe("group");
    expect(inner.source).toBe("hover:(bg(brand),gap(4))");
    expect(inner.members).toHaveLength(2);
  });

  it("accepts a single member", () => {
    expect(expressions("hover:(gap(4))")).toEqual(["hover:gap(4)"]);
  });

  it("knows nothing about utilities, variants or themes", () => {
    expect(expressions("nonsense:(whatever(zzz),also[not-real])")).toEqual([
      "nonsense:whatever(zzz)",
      "nonsense:also[not-real]",
    ]);
  });
});

describe("expansion", () => {
  it.each<[string, string[]]>([
    [
      "hover:(bg(brand),color(white),padding(4),radius(lg))",
      ["hover:bg(brand)", "hover:color(white)", "hover:padding(4)", "hover:radius(lg)"],
    ],
    [
      "md:(width(1/2),padding(6),gap(4),flex(row))",
      ["md:width(1/2)", "md:padding(6)", "md:gap(4)", "md:flex(row)"],
    ],
    [
      "md:hover:(bg(brand),color(white),scale(105))",
      ["md:hover:bg(brand)", "md:hover:color(white)", "md:hover:scale(105)"],
    ],
    [
      "sm:(padding(4),hover:(bg(brand),color(white)))",
      ["sm:padding(4)", "sm:hover:bg(brand)", "sm:hover:color(white)"],
    ],
    [
      "md:hover:(bg(brand),color(white),padding(4))",
      ["md:hover:bg(brand)", "md:hover:color(white)", "md:hover:padding(4)"],
    ],
  ])("expands the example %s", (source, expected) => {
    expect(expressions(source)).toEqual(expected);
  });

  it("appends a member's own variants after the group's", () => {
    expect(expressions("md:(hover:gap(4),focus:active:gap(8))")).toEqual([
      "md:hover:gap(4)",
      "md:focus:active:gap(8)",
    ]);
  });

  it("handles deep nesting", () => {
    expect(expressions("sm:(md:(lg:(xl:(gap(4)))))")).toEqual(["sm:md:lg:xl:gap(4)"]);
  });

  it("keeps source order and removes repeats", () => {
    expect(expressions("hover:(gap(8),gap(4),gap(8))")).toEqual(["hover:gap(8)", "hover:gap(4)"]);
  });

  it("gives each expression the position of its utility", () => {
    expect(expand(ok("sm:(padding(4),hover:(bg(brand)))"))).toEqual([
      { expression: "sm:padding(4)", span: { start: 4, end: 14 } },
      { expression: "sm:hover:bg(brand)", span: { start: 22, end: 31 } },
    ]);
  });

  it("expands a plain utility to itself", () => {
    expect(expand(ok("md:gap(4)"))).toEqual([
      { expression: "md:gap(4)", span: { start: 0, end: 9 } },
    ]);
  });

  it("always yields expressions that parse as single utilities", () => {
    for (const source of [
      "md:hover:(bg(alpha(brand,50)),width[calc(100%-var(--w))])",
      "sm:(font['a,b)',serif],hover:(margin[0_auto],x(a\\,b)))",
    ]) {
      for (const { expression } of expand(ok(source))) {
        expect(ok(expression).type, expression).toBe("utility");
      }
    }
  });
});

describe("contents of groups", () => {
  it("supports nested functions", () => {
    expect(expressions("hover:(bg(alpha(brand,50)),transform(rotate(45deg),scale(1.1)))")).toEqual([
      "hover:bg(alpha(brand,50))",
      "hover:transform(rotate(45deg),scale(1.1))",
    ]);
  });

  it("supports arbitrary values, with their commas and parentheses left alone", () => {
    expect(
      expressions("md:(width[calc(100%-var(--sidebar-width))],bg[rgb(0,0,0)],margin[0_auto])"),
    ).toEqual([
      "md:width[calc(100%-var(--sidebar-width))]",
      "md:bg[rgb(0,0,0)]",
      "md:margin[0_auto]",
    ]);
  });

  it("isn't confused by brackets and commas in strings", () => {
    expect(expressions("md:(font['a,b)',serif],gap(4))")).toEqual([
      "md:font['a,b)',serif]",
      "md:gap(4)",
    ]);
  });

  it("keeps escapes exactly as written", () => {
    expect(expressions("md:(x(a\\,b),y[a\\_b])")).toEqual(["md:x(a\\,b)", "md:y[a\\_b]"]);
    const inner = parse("md:x(a\\,b)");
    expect(inner.ok && inner.node.type === "utility" && inner.node.arguments[0]).toMatchObject({
      value: "a,b",
    });
  });

  it("supports empty calls", () => {
    expect(expressions("md:(flex(),border())")).toEqual(["md:flex()", "md:border()"]);
  });

  it("allows digit-leading variants", () => {
    expect(expressions("2xl:(gap(4),2xl-x:gap(8))")).toEqual(["2xl:gap(4)", "2xl:2xl-x:gap(8)"]);
  });
});

describe("malformed groups", () => {
  it.each<[string, ParseErrorCode]>([
    ["hover:()", "empty-group"],
    ["md:hover:()", "empty-group"],
    ["sm:(gap(4),hover:())", "empty-group"],
    ["hover:(,gap(4))", "empty-group-member"],
    ["hover:(gap(4),)", "empty-group-member"],
    ["hover:(gap(4),,gap(8))", "empty-group-member"],
    ["hover:(", "unterminated-group"],
    ["hover:(gap(4)", "unterminated-group"],
    ["hover:(gap(4),", "unterminated-group"],
    ["sm:(hover:(gap(4))", "unterminated-group"],
    ["(gap(4))", "group-without-variant"],
    ["(gap(4),gap(8))", "group-without-variant"],
    ["()", "group-without-variant"],
    ["hover:((gap(4)))", "group-without-variant"],
    ["hover:(gap)", "missing-value"],
    ["hover:(gap,gap(4))", "missing-value"],
    ["hover:(gap(4))x", "unexpected-token"],
    ["hover:(gap(4))(gap(8))", "unexpected-token"],
    ["hover:(gap(4))[1px]", "unexpected-token"],
    ["hover:(gap(4)gap(8))", "unexpected-token"],
    ["hover:(gap(4)", "unterminated-group"],
    ["hover:(Gap(4))", "invalid-name"],
    ["hover:(Md:gap(4))", "invalid-name"],
    ["hover:(gap(4)]", "invalid-character"],
    ["hover:([1px])", "unexpected-token"],
    ["hover:(gap(4", "unterminated-call"],
    ["hover:(width[1px)", "unbalanced-bracket"],
  ])("%j fails with %s", (source, code) => {
    expect(errorCode(source)).toBe(code);
  });

  it.each([
    "hover:( gap(4) )",
    "hover:(gap(4), gap(8))",
    "hover:(gap(4) ,gap(8))",
    "hover:\n(gap(4))",
  ])("rejects whitespace in %j", (source) => {
    expect(errorCode(source)).toBe("whitespace");
  });

  it("rejects a variant repeated by a member, at any depth", () => {
    expect(errorCode("hover:(hover:gap(4))")).toBe("duplicate-variant");
    expect(errorCode("md:hover:(sm:(md:gap(4)))")).toBe("duplicate-variant");
    expect(expressions("md:(hover:gap(4),hover:gap(8))")).toHaveLength(2);
  });

  it("points at the problem", () => {
    const source = "hover:(gap(4),,gap(8))";
    const result = parse(source);
    if (result.ok) throw new Error("expected failure");
    expect(result.error.span).toEqual({ start: 14, end: 15 });
    expect(formatParseError(result.error, source)).toContain(`${" ".repeat(16)}^`);
  });

  it("suggests how to write a group", () => {
    const result = parse("(gap(4))");
    expect(!result.ok && result.error.hint).toContain("hover:(");
  });

  it("limits nesting instead of overflowing", () => {
    const deep = `${"a:(".repeat(1)}${Array.from({ length: 30 }, (_, i) => `v${i}:(`).join("")}gap(4)${")".repeat(31)}`;
    expect(errorCode(deep)).toBe("too-deep");
    // Groups and calls share the limit, so this is the deepest group around a call.
    const allowed = `${Array.from({ length: 15 }, (_, i) => `v${i}:(`).join("")}gap(4)${")".repeat(15)}`;
    expect(expressions(allowed)).toHaveLength(1);
  });

  it("never throws on hostile input", () => {
    for (const source of [
      "a:(",
      "a:)",
      "a:(((((",
      "a:())))",
      "a:(b:",
      "a:(,",
      "a:(\\",
      ":(",
      "a::(b(1))",
    ]) {
      expect(() => parse(source)).not.toThrow();
    }
  });
});

describe("backward compatibility", () => {
  it.each([
    "gap(4)",
    "md:hover:bg(brand)",
    "bg(alpha(brand,50))",
    "width[calc(100%-1px)]",
    "flex()",
  ])("%s still parses as a single utility", (source) => {
    const node = ok(source);
    expect(node.type).toBe("utility");
    expect(node.source).toBe(source);
    expect(expand(node)).toEqual([{ expression: source, span: { start: 0, end: source.length } }]);
  });

  it("doesn't read a colon in a call or a bracket as a group", () => {
    expect(ok("bg[url(https://a.b/c:(d).png)]").type).toBe("utility");
    expect(errorCode("gap(a:(b))")).toBe("unexpected-token");
  });
});
