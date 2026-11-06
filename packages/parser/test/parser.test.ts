import { describe, expect, it } from "vitest";
import {
  formatParseError,
  parse,
  tokenize,
  type ParseErrorCode,
  type UtilityNode,
} from "@croff/parser";

function ok(source: string): UtilityNode {
  const result = parse(source);
  if (!result.ok) throw new Error(formatParseError(result.error, source));
  if (result.node.type !== "utility") throw new Error(`"${source}" isn't a single utility`);
  return result.node;
}

function errorCode(source: string): ParseErrorCode {
  const result = parse(source);
  if (result.ok) throw new Error(`Expected "${source}" to fail`);
  return result.error.code;
}

describe("basic utilities", () => {
  it("parses a single word argument", () => {
    const node = ok("gap(4)");
    expect(node.name).toBe("gap");
    expect(node.arguments).toMatchObject([{ type: "word", value: "4" }]);
    expect(node.variants).toEqual([]);
    expect(node.arbitrary).toBeUndefined();
  });

  it("parses empty calls", () => {
    expect(ok("flex()").arguments).toEqual([]);
  });

  it("parses several arguments", () => {
    expect(ok("border(1,dashed,muted)").arguments.map((a) => a.type === "word" && a.value)).toEqual(
      ["1", "dashed", "muted"],
    );
  });

  it("parses fractions, percentages, negatives and hex-like words", () => {
    for (const value of ["1/2", "50%", "-4", "#fff", "1.5rem", "brand-dark"]) {
      expect(ok(`x(${value})`).arguments[0]).toMatchObject({ type: "word", value });
    }
  });

  it("allows hyphenated names and ignores surrounding whitespace", () => {
    expect(ok("  min-width(full)\n").name).toBe("min-width");
    expect(ok("  min-width(full)\n").source).toBe("min-width(full)");
  });

  it("records spans", () => {
    const node = ok("md:gap(4)");
    expect(node.variants[0]!.span).toEqual({ start: 0, end: 2 });
    expect(node.nameSpan).toEqual({ start: 3, end: 6 });
    expect(node.arguments[0]!.span).toEqual({ start: 7, end: 8 });
  });
});

describe("nested arguments", () => {
  it("parses nested function calls", () => {
    expect(ok("bg(alpha(brand,50))").arguments).toMatchObject([
      {
        type: "call",
        name: "alpha",
        arguments: [
          { type: "word", value: "brand" },
          { type: "word", value: "50" },
        ],
      },
    ]);
  });

  it("parses multiple levels of nesting", () => {
    const node = ok("x(a(b(c(1))),d())");
    expect(node.arguments).toHaveLength(2);
    expect(node.arguments[0]).toMatchObject({
      name: "a",
      arguments: [{ name: "b", arguments: [{ name: "c", arguments: [{ value: "1" }] }] }],
    });
    expect(node.arguments[1]).toMatchObject({ name: "d", arguments: [] });
  });

  it("parses var() with a custom property", () => {
    expect(ok("width(var(--sidebar-width))").arguments[0]).toMatchObject({
      name: "var",
      arguments: [{ value: "--sidebar-width" }],
    });
  });

  it("rejects nesting beyond the limit rather than overflowing", () => {
    const deep = "x(" + "a(".repeat(20) + ")".repeat(21);
    expect(errorCode(deep)).toBe("too-deep");
  });
});

describe("bracket values", () => {
  it("keeps the raw text and decodes the value", () => {
    const node = ok("margin[0_auto]");
    expect(node.arbitrary).toMatchObject({ raw: "0_auto", value: "0 auto" });
    expect(node.arguments).toEqual([]);
  });

  it("handles nested parentheses and var()", () => {
    expect(ok("width[calc(100%-var(--sidebar-width))]").arbitrary?.value).toBe(
      "calc(100%-var(--sidebar-width))",
    );
  });

  it("handles nested brackets", () => {
    expect(ok("columns[[full-start]_1fr_[full-end]]").arbitrary?.value).toBe(
      "[full-start] 1fr [full-end]",
    );
  });

  it("handles commas", () => {
    expect(ok("bg[rgb(0,0,0)]").arbitrary?.value).toBe("rgb(0,0,0)");
  });

  it("ignores brackets inside quotes", () => {
    expect(ok("content['a]b']").arbitrary?.value).toBe("'a]b'");
    expect(ok('content["(("]').arbitrary?.value).toBe('"(("');
  });

  it("does not treat underscores in url() as spaces", () => {
    expect(ok("bg-image[url(/img/my_photo.png)]").arbitrary?.value).toBe("url(/img/my_photo.png)");
    expect(ok("bg[url(/a_b.png)_no-repeat]").arbitrary?.value).toBe("url(/a_b.png) no-repeat");
  });
});

describe("variants", () => {
  it("parses single and stacked variants in order", () => {
    expect(ok("hover:bg(brand)").variants.map((v) => v.name)).toEqual(["hover"]);
    expect(ok("md:hover:focus:bg(brand)").variants.map((v) => v.name)).toEqual([
      "md",
      "hover",
      "focus",
    ]);
  });

  it("allows digit-leading variants", () => {
    expect(ok("2xl:width(full)").variants[0]!.name).toBe("2xl");
  });

  it("works with bracket values", () => {
    const node = ok("lg:height[calc(100vh-80px)]");
    expect(node.variants[0]!.name).toBe("lg");
    expect(node.arbitrary?.value).toBe("calc(100vh-80px)");
  });

  it("does not read a colon inside brackets as a variant separator", () => {
    const node = ok("bg[url(https://example.com/x.png)]");
    expect(node.variants).toEqual([]);
    expect(node.arbitrary?.value).toBe("url(https://example.com/x.png)");
  });

  it("rejects duplicates and malformed names", () => {
    expect(errorCode("hover:hover:bg(brand)")).toBe("duplicate-variant");
    expect(errorCode("Hover:bg(brand)")).toBe("invalid-name");
    expect(errorCode(":bg(brand)")).toBe("unexpected-token");
  });
});

describe("escapes", () => {
  it("decodes escapes in call arguments", () => {
    expect(ok("x(a\\,b)").arguments[0]).toMatchObject({ value: "a,b" });
    expect(ok("x(a\\(b\\))").arguments[0]).toMatchObject({ value: "a(b)" });
    expect(ok("x(a\\:b)").arguments[0]).toMatchObject({ value: "a:b" });
    expect(ok("x(a\\\\b)").arguments[0]).toMatchObject({ value: "a\\b" });
    expect(ok("x(\\[a\\])").arguments[0]).toMatchObject({ value: "[a]" });
  });

  it("decodes CROFF escapes in bracket values", () => {
    expect(ok("x[a\\_b]").arbitrary?.value).toBe("a_b");
    expect(ok("x[a\\]b]").arbitrary?.value).toBe("a]b");
    expect(ok("x[a\\(b]").arbitrary?.value).toBe("a(b");
    expect(ok("x[a\\\\b]").arbitrary?.value).toBe("a\\b");
  });

  it("passes other backslash sequences through to CSS", () => {
    expect(ok("content['\\201C']").arbitrary?.value).toBe("'\\201C'");
  });

  it("does not let an escaped bracket close the value", () => {
    expect(errorCode("x[a\\]")).toBe("unterminated-bracket");
  });
});

describe("whitespace", () => {
  it.each([
    "width[calc(100% - 1px)]",
    "flex( row )",
    "gap(1, 2)",
    "a(b) c(d)",
    "x[a\\ b]",
    "x(a\\ b)",
  ])("rejects %j", (source) => {
    expect(errorCode(source)).toBe("whitespace");
  });

  it("suggests the underscore form", () => {
    const result = parse("width[calc(100% - 1px)]");
    expect(!result.ok && result.error.hint).toContain("underscore");
  });
});

describe("invalid syntax", () => {
  it.each<[string, ParseErrorCode]>([
    ["", "empty"],
    ["   ", "empty"],
    ["flex", "missing-value"],
    ["md:flex", "missing-value"],
    ["Flex(row)", "invalid-name"],
    ["1flex(row)", "invalid-name"],
    ["gap(4", "unterminated-call"],
    ["gap(a(4)", "unterminated-call"],
    ["gap(,4)", "empty-argument"],
    ["gap(4,)", "empty-argument"],
    ["gap(4)x", "unexpected-token"],
    ["gap(4)(5)", "unexpected-token"],
    ["gap)", "unexpected-token"],
    ["gap(a:b)", "unexpected-token"],
    ["width[", "unterminated-bracket"],
    ["width[calc(1px]", "unbalanced-bracket"],
    ["width[1px)]", "unbalanced-bracket"],
    ["width[]", "empty-bracket"],
    ["width[1px]x", "unexpected-token"],
    ["gap([1px])", "misplaced-bracket"],
    ["gap(4)\\", "trailing-escape"],
    ["x[a\\", "trailing-escape"],
    ["gap(<4)", "invalid-character"],
    ['gap("4")', "invalid-character"],
    ["gap(4;)", "invalid-character"],
  ])("%j fails with %s", (source, code) => {
    expect(errorCode(source)).toBe(code);
  });

  it("never throws on hostile input", () => {
    for (const source of [
      "((((",
      "))))",
      "[[[[",
      "]]]]",
      ":::",
      "\\",
      "a:",
      "()",
      "[]",
      "\u0000",
    ]) {
      expect(() => parse(source)).not.toThrow();
    }
  });

  it("formats errors with a caret under the span", () => {
    const source = "gap(4)x";
    const result = parse(source);
    if (result.ok) throw new Error("expected failure");
    expect(formatParseError(result.error, source)).toContain("        ^");
  });
});

describe("tokenizer", () => {
  it("reads a bracket as one token", () => {
    const result = tokenize("a:b[c(d)]");
    expect(result.ok && result.tokens.map((t) => t.kind)).toEqual([
      "word",
      "colon",
      "word",
      "bracket",
      "eof",
    ]);
  });
});
