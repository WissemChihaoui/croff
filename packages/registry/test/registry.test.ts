import { describe, expect, it } from "vitest";
import { parse } from "@croffcss/parser";
import {
  builtinUtilities,
  createRegistry,
  RegistrationError,
  spaceMathOperators,
  normalizeArbitraryValue,
  utilityCategories,
  values,
  type ResolveErrorCode,
} from "@croffcss/registry";
import { createTheme, tokenVariable } from "@croffcss/theme";

const { theme } = createTheme();

function resolve(source: string, registry = createRegistry(theme)) {
  const parsed = parse(source);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return registry.resolve(parsed.node, {
    theme,
    useToken: (scale, token) => `var(${tokenVariable(scale, token)})`,
  });
}

function declarations(source: string): Record<string, string> {
  const result = resolve(source);
  if (!result.ok) throw new Error(`${source}: ${result.error.message}`);
  return Object.fromEntries(result.declarations);
}

function errorCode(source: string): ResolveErrorCode {
  const result = resolve(source);
  if (result.ok) throw new Error(`Expected "${source}" to fail`);
  return result.error.code;
}

describe("built-in utilities", () => {
  it("has the required categories", () => {
    const names = new Set(builtinUtilities.map((u) => u.name));
    for (const required of [
      "display",
      "position",
      "overflow",
      "visibility",
      "z-index",
      "inset",
      "top",
      "right",
      "bottom",
      "left",
      "flex",
      "flex-direction",
      "flex-wrap",
      "align",
      "justify",
      "grow",
      "shrink",
      "basis",
      "columns",
      "rows",
      "gap",
      "column-gap",
      "row-gap",
      "grid-flow",
      "grid-span",
      "width",
      "height",
      "min-width",
      "max-width",
      "min-height",
      "max-height",
      "aspect-ratio",
      "padding",
      "padding-x",
      "padding-y",
      "margin",
      "margin-x",
      "margin-y",
      "font",
      "text-size",
      "text-weight",
      "text-color",
      "text-align",
      "line-height",
      "letter-spacing",
      "color",
      "scale",
      "text-decoration",
      "text-transform",
      "whitespace",
      "bg",
      "bg-color",
      "bg-image",
      "bg-size",
      "bg-position",
      "border",
      "border-color",
      "border-width",
      "radius",
      "outline",
      "ring",
      "shadow",
      "opacity",
      "cursor",
      "transition",
      "duration",
      "transform",
    ]) {
      expect(names, required).toContain(required);
    }
  });

  it("assigns every utility to a documented category", () => {
    for (const utility of builtinUtilities) {
      expect(utilityCategories, utility.name).toContain(utility.category);
      expect(utility.description.length, utility.name).toBeGreaterThan(0);
      expect(utility.examples.length, utility.name).toBeGreaterThan(0);
    }
  });

  it("resolves every documented example", () => {
    for (const utility of builtinUtilities) {
      for (const example of utility.examples) {
        const parsed = parse(example);
        expect(parsed.ok, example).toBe(true);
        if (parsed.ok) {
          expect(parsed.node.name, example).toBe(utility.name);
          const result = createRegistry(theme).resolve(parsed.node, {
            theme,
            useToken: (scale, token) => `var(${tokenVariable(scale, token)})`,
          });
          expect(result.ok ? "ok" : result.error.message, example).toBe("ok");
        }
      }
    }
  });

  it("has unique names", () => {
    const names = builtinUtilities.map((u) => u.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("logical utilities, for right-to-left languages", () => {
  it.each([
    ["padding-start(4)", { "padding-inline-start": "var(--croff-spacing-4)" }],
    ["padding-end(4)", { "padding-inline-end": "var(--croff-spacing-4)" }],
    ["margin-start(auto)", { "margin-inline-start": "auto" }],
    ["margin-end(-2)", { "margin-inline-end": "calc(var(--croff-spacing-2) * -1)" }],
    ["inset-start(0)", { "inset-inline-start": "var(--croff-spacing-0)" }],
    ["inset-end(1/2)", { "inset-inline-end": "50%" }],
    [
      "border-start(2,brand)",
      {
        "border-inline-start-width": "2px",
        "border-inline-start-style": "solid",
        "border-inline-start-color": "var(--croff-color-brand)",
      },
    ],
    ["border-end(none)", { "border-inline-end": "none" }],
    [
      "radius-start(md)",
      {
        "border-start-start-radius": "var(--croff-radius-md)",
        "border-end-start-radius": "var(--croff-radius-md)",
      },
    ],
    [
      "radius-end(md)",
      {
        "border-start-end-radius": "var(--croff-radius-md)",
        "border-end-end-radius": "var(--croff-radius-md)",
      },
    ],
  ])("%s follows the text direction", (source, expected) => {
    expect(declarations(source)).toEqual(expected);
  });
});

describe("value resolution", () => {
  it("uses theme tokens through custom properties", () => {
    expect(declarations("gap(4)")).toEqual({ gap: "var(--croff-spacing-4)" });
    expect(declarations("bg(brand)")).toEqual({ "background-color": "var(--croff-color-brand)" });
  });

  it("maps keywords", () => {
    expect(declarations("justify(between)")).toEqual({ "justify-content": "space-between" });
    expect(declarations("flex(col)")).toEqual({ display: "flex", "flex-direction": "column" });
    expect(declarations("flex()")).toEqual({ display: "flex" });
  });

  it("computes fractions and integers", () => {
    expect(declarations("width(1/2)")).toEqual({ width: "50%" });
    expect(declarations("width(1/3)")).toEqual({ width: "33.333333%" });
    expect(declarations("opacity(50)")).toEqual({ opacity: "0.5" });
    expect(declarations("columns(3)")).toEqual({
      "grid-template-columns": "repeat(3, minmax(0, 1fr))",
    });
  });

  it("supports negative spacing only where it makes sense", () => {
    expect(declarations("margin(-4)")).toEqual({ margin: "calc(var(--croff-spacing-4) * -1)" });
    expect(declarations("top(-2)")).toEqual({ top: "calc(var(--croff-spacing-2) * -1)" });
    expect(errorCode("padding(-4)")).toBe("invalid-argument");
  });

  it("expands multi-value shorthands", () => {
    expect(declarations("padding(4,8)")).toEqual({
      padding: "var(--croff-spacing-4) var(--croff-spacing-8)",
    });
    expect(declarations("margin(0,auto)")).toEqual({ margin: "var(--croff-spacing-0) auto" });
  });

  it("applies axis utilities to both properties", () => {
    expect(declarations("padding-x(4)")).toEqual({
      "padding-left": "var(--croff-spacing-4)",
      "padding-right": "var(--croff-spacing-4)",
    });
  });

  it("supports nested functions", () => {
    expect(declarations("bg(alpha(brand,50))")).toEqual({
      "background-color": "color-mix(in srgb, var(--croff-color-brand) 50%, transparent)",
    });
    expect(declarations("width(var(--sidebar))")).toEqual({ width: "var(--sidebar)" });
    expect(declarations("width(var(--sidebar,10px))")).toEqual({ width: "var(--sidebar, 10px)" });
    expect(declarations("transform(rotate(45deg),scale(1.1))")).toEqual({
      transform: "rotate(45deg) scale(1.1)",
    });
    expect(declarations("transform(translate-y(-2px))")).toEqual({
      transform: "translateY(-2px)",
    });
  });

  it("has distinct bg and bg-color bracket behavior", () => {
    expect(declarations("bg[#121212]")).toEqual({ background: "#121212" });
    expect(declarations("bg-color[#121212]")).toEqual({ "background-color": "#121212" });
  });

  it("sets declared border parts", () => {
    expect(declarations("border()")).toEqual({
      "border-width": "1px",
      "border-style": "solid",
    });
    expect(declarations("border(2,muted)")).toEqual({
      "border-width": "2px",
      "border-style": "solid",
      "border-color": "var(--croff-color-muted)",
    });
    expect(declarations("border(none)")).toEqual({ border: "none" });
  });
});

describe("errors", () => {
  it("reports unknown utilities and suggests corrections", () => {
    const result = resolve("pad(6)");
    expect(!result.ok && result.error.code).toBe("unknown-utility");
    expect(!result.ok && result.error.suggestion).toBe("padding(6)");
    expect(errorCode("nonsense(1)")).toBe("unknown-utility");
  });

  it("documents that aliases do not exist", () => {
    expect(errorCode("pad(6)")).toBe("unknown-utility");
    expect(errorCode("background(brand)")).toBe("unknown-utility");
  });

  it("reports unknown variants", () => {
    const result = resolve("hovr:bg(brand)");
    expect(!result.ok && result.error.code).toBe("unknown-variant");
    expect(!result.ok && result.error.hint).toContain("hover");
  });

  it("reports invalid arguments with suggestions", () => {
    const result = resolve("md:bg(brnad)");
    expect(!result.ok && result.error.code).toBe("invalid-argument");
    expect(!result.ok && result.error.suggestion).toBe("md:bg(brand)");
  });

  it.each([
    "gap(banana)",
    "gap(7)",
    "width(320px)",
    "opacity(101)",
    "opacity(-1)",
    "columns(0)",
    "columns(65)",
    "bg(alpha(brand,101))",
    "bg(alpha(nope,50))",
    "bg(alpha(brand))",
    "width(var(nope))",
    "width(var(--x,a\\;b))",
    "transform(evil(1))",
    "transform(rotate(a))",
    "width(1/0)",
    "aspect-ratio(1/0)",
    "gap(constructor)",
    "display(__proto__)",
  ])("rejects %s", (source) => {
    expect(errorCode(source)).toBe("invalid-argument");
  });

  it("nudges raw CSS towards brackets", () => {
    const result = resolve("width(320px)");
    expect(!result.ok && result.error.hint).toBe("For a raw CSS value use brackets: width[320px].");
  });

  it("reports missing and extra arguments", () => {
    expect(errorCode("gap()")).toBe("missing-argument");
    expect(errorCode("gap(1,2)")).toBe("too-many-arguments");
    expect(errorCode("padding(1,2,3,4,6)")).toBe("too-many-arguments");
  });

  it("rejects bracket values where disabled", () => {
    expect(errorCode("flex[row]")).toBe("bracket-not-supported");
  });

  it("rejects unsafe bracket values", () => {
    expect(errorCode("width[1px;color:red]")).toBe("unsafe-value");
    expect(errorCode("width[1px}body{display:none]")).toBe("unsafe-value");
    expect(errorCode("width[</style>]")).toBe("unsafe-value");
  });

  it("allows delimiters inside bracket strings", () => {
    expect(declarations("font['a;b',serif]")).toEqual({ "font-family": "'a;b',serif" });
  });
});

describe("math normalization", () => {
  it.each([
    ["calc(100vh-80px)", "calc(100vh - 80px)"],
    ["calc(100%-var(--sidebar-width))", "calc(100% - var(--sidebar-width))"],
    ["calc(100%+1px)", "calc(100% + 1px)"],
    ["calc(1px+-2px)", "calc(1px + -2px)"],
    ["calc(-1*var(--x))", "calc(-1*var(--x))"],
    ["calc((1px+2px)*3)", "calc((1px + 2px)*3)"],
    ["min(100%-1rem,500px)", "min(100% - 1rem,500px)"],
    ["clamp(1rem,2vw+1rem,3rem)", "clamp(1rem,2vw + 1rem,3rem)"],
    ["calc(var(--a-b)-var(--c-d))", "calc(var(--a-b) - var(--c-d))"],
    ["calc(1e-3*1px)", "calc(1e-3*1px)"],
    ["calc(1px - 2px)", "calc(1px - 2px)"],
    ["linear-gradient(90deg,#000,#333)", "linear-gradient(90deg,#000,#333)"],
    ["my-ident", "my-ident"],
    ["-1px", "-1px"],
    ["10px-5px", "10px-5px"],
    ["'calc(1-1)'", "'calc(1-1)'"],
  ])("%s → %s", (input, expected) => {
    expect(spaceMathOperators(input)).toBe(expected);
  });

  it("is used for bracket values", () => {
    const result = normalizeArbitraryValue("calc(100vh-80px)");
    expect(result).toEqual({ ok: true, value: "calc(100vh - 80px)" });
  });
});

describe("custom utilities", () => {
  it("registers and resolves", () => {
    const registry = createRegistry(theme);
    registry.addUtility({
      name: "tab-size",
      category: "typography",
      description: "Sets tab size.",
      args: [{ name: "size", types: [values.integer({ min: 1, max: 16 })] }],
      properties: ["tab-size"],
      examples: ["tab-size(4)"],
    });
    const result = resolve("tab-size(4)", registry);
    expect(result.ok && result.declarations).toEqual([["tab-size", "4"]]);
  });

  it("rejects duplicates unless overriding", () => {
    const registry = createRegistry(theme);
    const utility = {
      name: "gap",
      category: "grid",
      description: "x",
      args: [{ name: "v", types: [values.words("a")] }],
      properties: ["gap"],
      examples: [],
    };
    expect(() => registry.addUtility(utility)).toThrow(RegistrationError);
    const order = registry.utilityOrder("gap");
    registry.addUtility(utility, { override: true });
    expect(registry.utilityOrder("gap")).toBe(order);
    expect(resolve("gap(a)", registry).ok).toBe(true);
  });

  it.each([
    [{ name: "Bad Name", properties: ["x"] }, "Invalid utility name"],
    [{ name: "ok" }, 'needs either "properties" or "compile"'],
    [{ name: "ok", properties: ["x"], compile: () => ({}) }, "cannot have both"],
    [
      {
        name: "ok",
        properties: ["x"],
        args: [
          { name: "a", types: [values.words("a")], optional: true },
          { name: "b", types: [values.words("b")] },
        ],
      },
      "cannot follow an optional",
    ],
  ])("validates definitions %#", (partial, message) => {
    const registry = createRegistry(theme);
    expect(() =>
      registry.addUtility({ category: "x", description: "x", examples: [], ...partial }),
    ).toThrow(message);
  });

  it("validates variants", () => {
    const registry = createRegistry(theme);
    expect(() => registry.addVariant({ name: "x", selector: ":hover" })).toThrow(
      'must contain "&"',
    );
    expect(() => registry.addVariant({ name: "x" })).toThrow("needs a");
    expect(() => registry.addVariant({ name: "x", atRule: "media" })).toThrow('start with "@"');
    expect(() => registry.addVariant({ name: "x", selector: "&{}" })).toThrow('"{"');
    expect(() => registry.addVariant({ name: "hover", selector: "&:x" })).toThrow("already");
  });
});

describe("variants from the theme", () => {
  it("derives responsive variants from breakpoints", () => {
    const { theme: custom } = createTheme([{ breakpoints: { tablet: "800px" } }], {});
    const registry = createRegistry(custom);
    expect(registry.getVariant("tablet")?.atRule).toBe("@media (min-width: 800px)");
    expect(registry.getVariant("md")).toBeDefined();
  });
});

describe("bracket values cannot damage the rest of the stylesheet", () => {
  it.each([
    ["an unterminated comment", "width[1px/*]"],
    ["an escaped open paren", "width[a\\(]"],
    ["an escaped close paren", "width[a\\)]"],
    ["an escaped open bracket", "width[a\\[]"],
    ["a trailing backslash", "width[1px\\\\]"],
  ])("rejects %s", (_name, source) => {
    expect(errorCode(source)).toBe("unsafe-value");
  });

  it("allows semicolons inside url(), for data URIs", () => {
    expect(declarations("bg-image[url(data:image/png;base64,iVBORw0KGgo=)]")).toEqual({
      "background-image": "url(data:image/png;base64,iVBORw0KGgo=)",
    });
  });

  it("still rejects top-level semicolons and braces inside functions", () => {
    expect(errorCode("width[1px;color:red]")).toBe("unsafe-value");
    expect(errorCode("width[calc(1px}body{color:red)]")).toBe("unsafe-value");
  });
});

describe("color", () => {
  it("sets the text color from a token", () => {
    expect(declarations("color(white)")).toEqual({ color: "var(--croff-color-white)" });
  });

  it.each([
    "brand",
    "gray-500",
    "transparent",
    "current",
    "inherit",
    "alpha(brand,50)",
    "var(--accent)",
    "var(--accent,red)",
  ])("is identical to text-color for %s", (value) => {
    expect(declarations(`color(${value})`)).toEqual(declarations(`text-color(${value})`));
  });

  it("accepts brackets", () => {
    expect(declarations("color[#ff00aa]")).toEqual({ color: "#ff00aa" });
    expect(declarations("color[oklch(70%_0.2_120)]")).toEqual({ color: "oklch(70% 0.2 120)" });
  });

  it("validates like any other color utility", () => {
    expect(errorCode("color(nope)")).toBe("invalid-argument");
    expect(errorCode("color(12)")).toBe("invalid-argument");
    expect(errorCode("color()")).toBe("missing-argument");
    expect(errorCode("color(brand,dark)")).toBe("too-many-arguments");
    expect(errorCode("color[red;x:y]")).toBe("unsafe-value");
  });

  it("suggests corrections", () => {
    const result = resolve("md:color(brnad)");
    expect(!result.ok && result.error.suggestion).toBe("md:color(brand)");
  });
});

describe("scale", () => {
  it.each([
    ["scale(105)", "scale(1.05)"],
    ["scale(100)", "scale(1)"],
    ["scale(95)", "scale(0.95)"],
    ["scale(107)", "scale(1.07)"],
    ["scale(7)", "scale(0.07)"],
    ["scale(0)", "scale(0)"],
    ["scale(250)", "scale(2.5)"],
    ["scale(-100)", "scale(-1)"],
    ["scale(1000)", "scale(10)"],
    ["scale(var(--zoom))", "scale(var(--zoom))"],
  ])("%s compiles to transform: %s", (source, expected) => {
    expect(declarations(source)).toEqual({ transform: expected });
  });

  it("wraps a bracket value in the scale function", () => {
    expect(declarations("scale[1.05]")).toEqual({ transform: "scale(1.05)" });
    expect(declarations("scale[1.2,0.8]")).toEqual({ transform: "scale(1.2,0.8)" });
    expect(declarations("scale[var(--a)]")).toEqual({ transform: "scale(var(--a))" });
    expect(declarations("scale[calc(1+0.5)]")).toEqual({ transform: "scale(calc(1 + 0.5))" });
  });

  it("gives the same result as the longer forms", () => {
    expect(declarations("scale(105)")).toEqual(declarations("transform(scale(1.05))"));
    expect(declarations("scale[1.05]")).toEqual(declarations("transform[scale(1.05)]"));
  });

  it.each([
    ["scale(1.05)", "invalid-argument"],
    ["scale(brand)", "invalid-argument"],
    ["scale(1001)", "invalid-argument"],
    ["scale(-1001)", "invalid-argument"],
    ["scale(105%)", "invalid-argument"],
    ["scale()", "missing-argument"],
    ["scale(1,2)", "too-many-arguments"],
    ["scale[1;color:red]", "unsafe-value"],
    ["scale[1)]", "unsafe-value"],
  ] as const)("rejects %s", (source, code) => {
    const parsed = parse(source);
    if (!parsed.ok) {
      // Unbalanced brackets are already a syntax error.
      expect(source).toBe("scale[1)]");
      return;
    }
    expect(errorCode(source)).toBe(code);
  });

  it("points a fractional scale at brackets", () => {
    const result = resolve("scale(1.05)");
    expect(!result.ok && result.error.hint).toBe("For a raw CSS value use brackets: scale[1.05].");
  });
});

describe("function bracket forms", () => {
  it("works for custom utilities, after the value is checked", () => {
    const registry = createRegistry(theme);
    registry.addUtility({
      name: "rotate-by",
      category: "effects",
      description: "x",
      arbitrary: (value) => ({ transform: `rotate(${value})` }),
      examples: [],
    });
    expect(resolve("rotate-by[45deg]", registry)).toMatchObject({
      declarations: [["transform", "rotate(45deg)"]],
    });
    const unsafe = resolve("rotate-by[1;x:y]", registry);
    expect(!unsafe.ok && unsafe.error.code).toBe("unsafe-value");
  });
});
