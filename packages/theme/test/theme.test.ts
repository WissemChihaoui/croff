import { describe, expect, it } from "vitest";
import {
  createTheme,
  hasToken,
  isSafeCssValue,
  sortedBreakpoints,
  themeVariables,
  tokenKey,
  tokenVariable,
} from "@croffcss/theme";

describe("default tokens", () => {
  const { theme, issues } = createTheme();

  it("is valid", () => {
    expect(issues).toEqual([]);
  });

  it("flattens nested groups", () => {
    expect(theme.scales["colors"]!["gray-500"]).toBe("#73736f");
    expect(theme.scales["colors"]!["brand"]).toBe("#c8fd12");
  });

  it("has the five standard breakpoints, sorted", () => {
    expect(sortedBreakpoints(theme).map((b) => b.name)).toEqual(["sm", "md", "lg", "xl", "2xl"]);
  });
});

describe("custom tokens", () => {
  it("merges over the default theme", () => {
    const { theme } = createTheme([{ colors: { accent: "#123456", brand: "#ABCDEF" } }]);
    expect(theme.scales["colors"]!["accent"]).toBe("#123456");
    expect(theme.scales["colors"]!["brand"]).toBe("#abcdef");
    expect(theme.scales["colors"]!["muted"]).toBeDefined();
  });

  it("applies layers in order", () => {
    const { theme } = createTheme([{ colors: { a: "red" } }, { colors: { a: "blue" } }]);
    expect(theme.scales["colors"]!["a"]).toBe("blue");
  });

  it("removes tokens and groups with null", () => {
    const { theme } = createTheme([{ colors: { brand: null, gray: null } }]);
    expect(hasToken(theme, "colors", "brand")).toBe(false);
    expect(hasToken(theme, "colors", "gray-100")).toBe(false);
    expect(hasToken(theme, "colors", "muted")).toBe(true);
  });

  it("removes a scale with null", () => {
    const { theme } = createTheme([{ shadows: null }]);
    expect(theme.scales["shadows"]).toEqual({});
  });

  it("starts empty with preset none", () => {
    const { theme } = createTheme([{ colors: { a: "red" } }], { preset: "none" });
    expect(Object.keys(theme.scales)).toEqual(["colors"]);
  });

  it("accepts custom scales and numeric values", () => {
    const { theme, issues } = createTheme([
      { gradients: { sunrise: "linear-gradient(red,blue)" } },
    ]);
    expect(issues).toEqual([]);
    expect(tokenVariable("gradients", "sunrise")).toBe("--croff-gradients-sunrise");
    expect(theme.scales["gradients"]!["sunrise"]).toContain("linear-gradient");
    expect(
      createTheme([{ textWeights: { heavy: 800 } }]).theme.scales["textWeights"]!["heavy"],
    ).toBe("800");
  });

  it("does not resolve tokens on the object prototype", () => {
    const { theme } = createTheme();
    expect(hasToken(theme, "colors", "constructor")).toBe(false);
    expect(hasToken(theme, "colors", "__proto__")).toBe(false);
  });
});

describe("invalid values", () => {
  it.each([
    ["colors", "not a color"],
    ["colors", "#12"],
    ["spacing", "wide"],
    ["breakpoints", "100vw"],
    ["durations", "200"],
    ["colors", "red;}body{display:none"],
    ["fonts", "x}</style>"],
    ["colors", ""],
  ])("rejects %s value %j", (scale, value) => {
    const { theme, issues } = createTheme([{ [scale]: { bad: value } }]);
    expect(issues.map((i) => i.code)).toEqual(["invalid-token-value"]);
    expect(issues[0]!.token).toBe("bad");
    expect(hasToken(theme, scale, "bad")).toBe(false);
  });

  it("rejects bad token and scale names", () => {
    expect(createTheme([{ colors: { "a.b": "red" } }]).issues[0]!.code).toBe("invalid-token-name");
    expect(createTheme([{ "not-valid": { a: "red" } }]).issues[0]!.code).toBe("invalid-scale-name");
  });

  it("allows delimiters inside strings", () => {
    expect(isSafeCssValue('"a;b{c}"')).toBe(true);
    expect(isSafeCssValue('"unterminated')).toBe(false);
  });
});

describe("values of the wrong shape", () => {
  const issues = (theme: unknown) => createTheme([theme as never], { preset: "none" }).issues;

  it.each([["red"], [5], [true], [["red"]]])("rejects %j as a whole scale", (scale) => {
    const { issues, theme } = createTheme([{ colors: scale as never }], { preset: "none" });
    expect(issues).toMatchObject([{ code: "invalid-scale-value", scale: "colors" }]);
    expect(theme.scales["colors"] ?? {}).toEqual({});
  });

  it("keeps the preset's tokens when a scale is rejected", () => {
    const { theme } = createTheme([{ colors: "red" as never }]);
    expect(hasToken(theme, "colors", "brand")).toBe(true);
    expect(hasToken(theme, "colors", "0")).toBe(false);
  });

  it.each([
    [undefined],
    [true],
    [Number.NaN],
    [Number.POSITIVE_INFINITY],
    [["red"]],
    [() => "red"],
  ])("rejects %s as a token value", (value) => {
    expect(issues({ colors: { a: value } })).toMatchObject([
      { code: "invalid-token-value", scale: "colors", token: "a" },
    ]);
  });

  it("still accepts numbers, nested groups and removals", () => {
    expect(issues({ lineHeights: { a: 1.5 }, colors: { a: { b: "red" }, c: null } })).toEqual([]);
  });
});

describe("collisions", () => {
  it("reports two scales that produce the same custom property", () => {
    const { issues, theme } = createTheme([{ textSize: { lg: "1rem" } }]);
    expect(issues).toMatchObject([{ code: "token-collision", scale: "textSize", token: "lg" }]);
    expect(issues[0]!.message).toContain("--croff-text-size-lg");
    expect(issues[0]!.message).toContain("textSizes");
    const names = themeVariables(theme).map((variable) => variable.name);
    expect(names.filter((name) => name === "--croff-text-size-lg")).toHaveLength(1);
  });

  it("allows the same token name in unrelated scales", () => {
    expect(createTheme([{ custom: { lg: "1rem" } }]).issues).toEqual([]);
  });

  it("ignores breakpoints, which have no custom property", () => {
    expect(createTheme([{ breakpoint: { md: "1px" }, breakpoints: { md: "1px" } }]).issues).toEqual(
      [],
    );
  });

  it("reports two spellings of one token in the same layer", () => {
    const { issues, theme } = createTheme([{ colors: { "a-b": "red", a: { b: "blue" } } }], {
      preset: "none",
    });
    expect(issues).toMatchObject([{ code: "token-collision", scale: "colors", token: "a-b" }]);
    expect(theme.scales["colors"]!["a-b"]).toBe("red");
  });

  it("lets a later layer replace a token, however it is spelled", () => {
    const { issues, theme } = createTheme(
      [{ colors: { "a-b": "red" } }, { colors: { a: { b: "blue" } } }],
      { preset: "none" },
    );
    expect(issues).toEqual([]);
    expect(theme.scales["colors"]!["a-b"]).toBe("blue");
  });
});

describe("breakpoint names", () => {
  it.each(["Tablet", "my_size", "A1"])(
    "rejects %s, which can't be written as a variant",
    (name) => {
      expect(createTheme([{ breakpoints: { [name]: "1px" } }]).issues).toMatchObject([
        { code: "invalid-token-name", scale: "breakpoints", token: name },
      ]);
    },
  );

  it("accepts the names variants can use", () => {
    expect(
      createTheme([{ breakpoints: { tablet: "1px", "3xl": "2px", a: { b: "3px" } } }]).issues,
    ).toEqual([]);
  });
});

describe("CSS variable output", () => {
  const { theme } = createTheme([{ colors: { brand: "#A8FF32" } }]);

  it("names variables by scale", () => {
    expect(tokenVariable("colors", "brand")).toBe("--croff-color-brand");
    expect(tokenVariable("spacing", "4")).toBe("--croff-spacing-4");
    expect(tokenVariable("textSizes", "lg")).toBe("--croff-text-size-lg");
  });

  it("lowercases hex values", () => {
    const variable = themeVariables(theme).find((v) => v.name === "--croff-color-brand");
    expect(variable?.value).toBe("#a8ff32");
  });

  it("restricts to used tokens", () => {
    const used = new Set([tokenKey("spacing", "4"), tokenKey("colors", "brand")]);
    expect(themeVariables(theme, used).map((v) => v.name)).toEqual([
      "--croff-color-brand",
      "--croff-spacing-4",
    ]);
  });

  it("never exposes breakpoints as variables", () => {
    expect(themeVariables(theme).some((v) => v.scale === "breakpoints")).toBe(false);
  });

  it("sorts breakpoints by width, across units", () => {
    const { theme: custom } = createTheme([{ breakpoints: { tablet: "50rem", phone: "480px" } }], {
      preset: "none",
    });
    expect(sortedBreakpoints(custom).map((b) => b.name)).toEqual(["phone", "tablet"]);
  });
});

describe("values that could damage the rest of the stylesheet", () => {
  it.each(["a(", "a)", "a[", "1px/*", "1px\\", "'a\nb'", "calc(1px}x{)"])("rejects %j", (value) => {
    expect(isSafeCssValue(value)).toBe(false);
  });

  it.each([
    "linear-gradient(90deg, #000, #333)",
    "url(data:image/png;base64,AAAA)",
    "'a;b{c}/*'",
    "'\\201C'",
    "1px",
  ])("accepts %j", (value) => {
    expect(isSafeCssValue(value)).toBe(true);
  });
});
