import { defaultTheme } from "./default-theme.js";
import type { ResolvedTheme, ThemeConfig, ThemeIssue, TokenGroup } from "./types.js";

const TOKEN_NAME = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
const SCALE_NAME = /^[a-zA-Z][a-zA-Z0-9]*$/;
/** Breakpoints become variants, so their names follow the grammar of variants. */
const BREAKPOINT_NAME = /^[a-z0-9][a-z0-9-]*$/;

const LENGTH =
  /^(0|-?(\d+\.?\d*|\.\d+)(px|rem|em|%|vw|vh|vmin|vmax|dvh|svh|lvh|ch|ex|lh|rlh|cm|mm|in|pt|pc))$/;
const CSS_FUNCTION = /^[a-zA-Z-]+\(.*\)$/s;
const NUMBER = /^-?(\d+\.?\d*|\.\d+)$/;
const TIME = /^(\d+\.?\d*|\.\d+)(ms|s)$/;
const HEX_COLOR = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const NAMED = /^[a-zA-Z]+$/;
const BREAKPOINT = /^(\d+\.?\d*|\.\d+)(px|rem|em)$/;

type Validator = { test(value: string): boolean; expected: string };

const VALIDATORS: Record<string, Validator> = {
  colors: {
    test: (v) => HEX_COLOR.test(v) || CSS_FUNCTION.test(v) || NAMED.test(v),
    expected: "a CSS color such as #c8fd12, rgb(...), oklch(...) or a named color",
  },
  spacing: {
    test: (v) => LENGTH.test(v) || CSS_FUNCTION.test(v),
    expected: "a CSS length such as 1rem",
  },
  radius: {
    test: (v) => LENGTH.test(v) || CSS_FUNCTION.test(v),
    expected: "a CSS length such as 0.5rem",
  },
  textSizes: {
    test: (v) => LENGTH.test(v) || CSS_FUNCTION.test(v),
    expected: "a CSS length such as 1rem",
  },
  letterSpacings: {
    test: (v) => LENGTH.test(v) || CSS_FUNCTION.test(v) || v === "normal",
    expected: "a CSS length such as 0.02em",
  },
  lineHeights: {
    test: (v) => NUMBER.test(v) || LENGTH.test(v) || v === "normal",
    expected: "a number or length such as 1.5",
  },
  textWeights: {
    test: (v) => NUMBER.test(v) || v === "normal" || v === "bold",
    expected: "a font weight such as 600",
  },
  breakpoints: {
    test: (v) => BREAKPOINT.test(v),
    expected: "a width in px, em or rem, such as 768px",
  },
  durations: {
    test: (v) => TIME.test(v),
    expected: "a time such as 200ms",
  },
};

/**
 * True when a value cannot affect anything outside its own declaration. Besides
 * ending the declaration or the rule, a value could swallow the rules after it
 * with an unterminated comment, string or function, or by escaping what follows.
 */
export function isSafeCssValue(value: string): boolean {
  let quote: string | null = null;
  const open: string[] = [];
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]!;
    if (ch === "\\") {
      i++;
      if (i >= value.length) return false;
    } else if (quote) {
      if (ch === "\n") return false;
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
    } else if (ch === "{" || ch === "}") {
      return false;
    } else if (ch === ";") {
      // Allowed in functions, for data URIs: url(data:image/png;base64,...).
      if (open.length === 0) return false;
    } else if ((ch === "<" && value[i + 1] === "/") || (ch === "/" && value[i + 1] === "*")) {
      return false;
    } else if (ch === "(" || ch === "[") {
      open.push(ch);
    } else if (ch === ")" || ch === "]") {
      if (open.pop() !== (ch === ")" ? "(" : "[")) return false;
    }
  }
  return quote === null && open.length === 0;
}

function normalizeValue(scale: string, value: string): string {
  const trimmed = value.trim();
  return scale === "colors" && HEX_COLOR.test(trimmed) ? trimmed.toLowerCase() : trimmed;
}

function mergeScale(
  target: Record<string, string>,
  group: TokenGroup,
  scale: string,
  prefix: string,
  issues: ThemeIssue[],
  written: Set<string>,
): void {
  for (const [key, value] of Object.entries(group)) {
    const name = prefix ? `${prefix}-${key}` : key;
    if (!TOKEN_NAME.test(key)) {
      issues.push({
        code: "invalid-token-name",
        scale,
        token: name,
        message: `Token "${name}" in "${scale}" has an invalid name. Use letters, digits, "-" and "_".`,
      });
    } else if (scale === "breakpoints" && !BREAKPOINT_NAME.test(key)) {
      issues.push({
        code: "invalid-token-name",
        scale,
        token: name,
        message: `Breakpoint "${name}" can't be written as a variant. Use lowercase letters, digits and "-".`,
      });
    } else if (value === null) {
      for (const existing of Object.keys(target)) {
        if (existing === name || existing.startsWith(`${name}-`)) delete target[existing];
      }
    } else if (typeof value === "object" && !Array.isArray(value)) {
      mergeScale(target, value, scale, name, issues, written);
    } else if (typeof value !== "string" && !Number.isFinite(value)) {
      issues.push({
        code: "invalid-token-value",
        scale,
        token: name,
        message: `Token "${name}" in "${scale}" must be a string, a number or a group of tokens.`,
      });
    } else {
      const text = normalizeValue(scale, String(value));
      const validator = VALIDATORS[scale];
      if (text === "" || !isSafeCssValue(text)) {
        issues.push({
          code: "invalid-token-value",
          scale,
          token: name,
          message: `Token "${name}" in "${scale}" has an unsafe or empty value: ${JSON.stringify(value)}.`,
        });
      } else if (validator && !validator.test(text)) {
        issues.push({
          code: "invalid-token-value",
          scale,
          token: name,
          message: `Token "${name}" in "${scale}" should be ${validator.expected}, got ${JSON.stringify(value)}.`,
        });
      } else if (written.has(name)) {
        issues.push({
          code: "token-collision",
          scale,
          token: name,
          message: `Token "${name}" in "${scale}" is written twice in one theme, once as a nested group. Keep one of them.`,
        });
      } else {
        written.add(name);
        target[name] = text;
      }
    }
  }
}

export interface CreateThemeOptions {
  /** `"default"` starts from the default theme; `"none"` starts empty. */
  preset?: "default" | "none";
}

export interface CreateThemeResult {
  theme: ResolvedTheme;
  issues: ThemeIssue[];
}

/** Drops tokens that would share a custom property with a token of an earlier scale. */
function dropCollisions(scales: ResolvedTheme["scales"], issues: ThemeIssue[]): void {
  const owners = new Map<string, string>();
  for (const [scale, tokens] of Object.entries(scales)) {
    if (NON_VARIABLE_SCALES.has(scale)) continue;
    for (const token of Object.keys(tokens)) {
      const variable = tokenVariable(scale, token);
      const owner = owners.get(variable);
      if (owner === undefined) {
        owners.set(variable, scale);
      } else {
        delete tokens[token];
        issues.push({
          code: "token-collision",
          scale,
          token,
          message: `Token "${token}" in "${scale}" would use ${variable}, which belongs to "${owner}". Rename the scale or the token.`,
        });
      }
    }
  }
}

/** Merges theme layers, in order, on top of the preset. Invalid tokens are dropped and reported. */
export function createTheme(
  layers: ReadonlyArray<ThemeConfig | undefined> = [],
  options: CreateThemeOptions = {},
): CreateThemeResult {
  const scales: Record<string, Record<string, string>> = {};
  const issues: ThemeIssue[] = [];
  const base: ThemeConfig = options.preset === "none" ? {} : defaultTheme;

  for (const layer of [base, ...layers]) {
    if (!layer) continue;
    for (const [scale, group] of Object.entries(layer)) {
      if (!SCALE_NAME.test(scale)) {
        issues.push({
          code: "invalid-scale-name",
          scale,
          message: `"${scale}" is not a valid theme scale name. Use camelCase letters and digits.`,
        });
      } else if (group === null) {
        scales[scale] = {};
      } else if (typeof group === "object" && !Array.isArray(group)) {
        mergeScale((scales[scale] ??= {}), group, scale, "", issues, new Set());
      } else if (group !== undefined) {
        issues.push({
          code: "invalid-scale-value",
          scale,
          message: `Theme scale "${scale}" must be an object of tokens, got ${JSON.stringify(group)}.`,
        });
      }
    }
  }
  dropCollisions(scales, issues);
  return { theme: { scales }, issues };
}

const SCALE_PREFIXES: Record<string, string> = {
  colors: "color",
  fonts: "font",
  textSizes: "text-size",
  textWeights: "text-weight",
  lineHeights: "line-height",
  letterSpacings: "letter-spacing",
  shadows: "shadow",
  durations: "duration",
};

function scalePrefix(scale: string): string {
  return SCALE_PREFIXES[scale] ?? scale.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/** The custom property name for a token: `--croff-color-brand`. */
export function tokenVariable(scale: string, token: string): string {
  return `--croff-${scalePrefix(scale)}-${token}`;
}

export function hasToken(theme: ResolvedTheme, scale: string, token: string): boolean {
  const tokens = theme.scales[scale];
  return tokens !== undefined && Object.hasOwn(tokens, token);
}

export function tokenNames(theme: ResolvedTheme, scale: string): string[] {
  return Object.keys(theme.scales[scale] ?? {});
}

/** Scales that are not exposed as custom properties, since media queries cannot read `var()`. */
const NON_VARIABLE_SCALES = new Set(["breakpoints"]);

export interface ThemeVariable {
  name: string;
  value: string;
  scale: string;
  token: string;
}

/**
 * Lists custom properties in stable order. With `only`, restricts to the given
 * `scale/token` keys, so that unused tokens never reach production CSS.
 */
export function themeVariables(theme: ResolvedTheme, only?: ReadonlySet<string>): ThemeVariable[] {
  const variables: ThemeVariable[] = [];
  for (const [scale, tokens] of Object.entries(theme.scales)) {
    if (NON_VARIABLE_SCALES.has(scale)) continue;
    for (const [token, value] of Object.entries(tokens)) {
      if (!only || only.has(tokenKey(scale, token))) {
        variables.push({ name: tokenVariable(scale, token), value, scale, token });
      }
    }
  }
  return variables;
}

export function tokenKey(scale: string, token: string): string {
  return `${scale}/${token}`;
}

export interface Breakpoint {
  name: string;
  value: string;
  /** Width in px, used to sort. Assumes 16px per rem/em. */
  width: number;
}

/** Breakpoints sorted narrowest-first, regardless of declaration order. */
export function sortedBreakpoints(theme: ResolvedTheme): Breakpoint[] {
  return Object.entries(theme.scales["breakpoints"] ?? {})
    .map(([name, value]) => ({
      name,
      value,
      width: Number.parseFloat(value) * (value.endsWith("px") ? 1 : 16),
    }))
    .sort((a, b) => a.width - b.width || (a.name < b.name ? -1 : 1));
}
