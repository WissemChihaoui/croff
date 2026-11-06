import type { ArgumentNode } from "@croff/parser";
import { hasToken, tokenNames } from "@croff/theme";
import type { ResolveContext, ValueType } from "./types.js";

/** A token from a theme scale. With `negative`, `-4` means `calc(var(...) * -1)`. */
export function token(scale: string, options: { negative?: boolean } = {}): ValueType {
  return {
    kind: "token",
    describe: (theme) => ({
      label: `${scale} token`,
      scale,
      values: tokenNames(theme, scale),
    }),
    resolve(argument, context) {
      if (argument.type !== "word") return undefined;
      const { value } = argument;
      if (hasToken(context.theme, scale, value)) return context.useToken(scale, value);
      if (options.negative && value.startsWith("-")) {
        const positive = value.slice(1);
        if (hasToken(context.theme, scale, positive)) {
          return `calc(${context.useToken(scale, positive)} * -1)`;
        }
      }
      return undefined;
    },
  };
}

/** A fixed set of words, each mapped to its CSS value. */
export function keywords(map: Record<string, string>): ValueType {
  return {
    kind: "keyword",
    describe: () => ({ label: "keyword", values: Object.keys(map) }),
    resolve(argument) {
      if (argument.type !== "word" || !Object.hasOwn(map, argument.value)) return undefined;
      return map[argument.value];
    },
  };
}

/** The same words in CROFF and CSS. */
export function words(...values: string[]): ValueType {
  return keywords(Object.fromEntries(values.map((value) => [value, value])));
}

/** A whole number within bounds, optionally transformed. */
export function integer(
  options: { min?: number; max?: number; format?: (value: number) => string; label?: string } = {},
): ValueType {
  const { min = 0, max = 9999, format = String, label } = options;
  return {
    kind: "integer",
    describe: () => ({ label: label ?? `integer ${min}–${max}` }),
    resolve(argument) {
      if (argument.type !== "word" || !/^-?\d+$/.test(argument.value)) return undefined;
      const number = Number.parseInt(argument.value, 10);
      return number >= min && number <= max ? format(number) : undefined;
    },
  };
}

/** A fraction such as `1/3`, as a percentage. */
export function fraction(): ValueType {
  return {
    kind: "fraction",
    describe: () => ({ label: "fraction, e.g. 1/2" }),
    resolve(argument) {
      if (argument.type !== "word") return undefined;
      const match = /^(\d+)\/(\d+)$/.exec(argument.value);
      if (!match || Number(match[2]) === 0) return undefined;
      const percent = (Number(match[1]) / Number(match[2])) * 100;
      return `${Number(percent.toFixed(6))}%`;
    },
  };
}

/** A ratio such as `16/9`. */
export function ratio(): ValueType {
  return {
    kind: "ratio",
    describe: () => ({ label: "ratio, e.g. 16/9" }),
    resolve(argument) {
      if (argument.type !== "word") return undefined;
      const match = /^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(argument.value);
      return match && Number(match[2]) !== 0 ? `${match[1]} / ${match[2]}` : undefined;
    },
  };
}

const CUSTOM_PROPERTY = /^--[a-zA-Z0-9_-]+$/;
const SAFE_LITERAL = /^[a-zA-Z0-9.%#+-]+$/;

/** `var(--name)` or `var(--name,fallback)`. */
export function cssVar(): ValueType {
  return {
    kind: "function",
    describe: () => ({ label: "var(--name)" }),
    resolve(argument) {
      if (argument.type !== "call" || argument.name !== "var") return undefined;
      const [name, fallback, ...rest] = argument.arguments;
      if (rest.length > 0 || name?.type !== "word" || !CUSTOM_PROPERTY.test(name.value)) {
        return undefined;
      }
      if (fallback === undefined) return `var(${name.value})`;
      if (fallback.type !== "word" || !SAFE_LITERAL.test(fallback.value)) return undefined;
      return `var(${name.value}, ${fallback.value})`;
    },
  };
}

function resolveAny(
  types: ValueType[],
  argument: ArgumentNode | undefined,
  context: ResolveContext,
): string | undefined {
  if (!argument) return undefined;
  for (const type of types) {
    const value = type.resolve(argument, context);
    if (value !== undefined) return value;
  }
  return undefined;
}

/** `alpha(color,percent)`: a color at a given opacity. */
export function alpha(colorTypes: () => ValueType[]): ValueType {
  return {
    kind: "function",
    describe: () => ({ label: "alpha(color,0–100)" }),
    resolve(argument, context) {
      if (argument.type !== "call" || argument.name !== "alpha") return undefined;
      if (argument.arguments.length !== 2) return undefined;
      const color = resolveAny(colorTypes(), argument.arguments[0], context);
      const amount = integer({ min: 0, max: 100 }).resolve(argument.arguments[1]!, context);
      if (color === undefined || amount === undefined) return undefined;
      return `color-mix(in srgb, ${color} ${amount}%, transparent)`;
    },
  };
}

const TRANSFORM_FUNCTIONS: Record<string, string> = {
  translate: "translate",
  "translate-x": "translateX",
  "translate-y": "translateY",
  scale: "scale",
  "scale-x": "scaleX",
  "scale-y": "scaleY",
  rotate: "rotate",
  skew: "skew",
  "skew-x": "skewX",
  "skew-y": "skewY",
};

const TRANSFORM_ARGUMENT = /^-?(\d+\.?\d*|\.\d+)(deg|turn|rad|grad|px|rem|em|%|vw|vh)?$/;

/** A CSS transform function with literal arguments, e.g. `rotate(45deg)`. */
export function transformFunction(): ValueType {
  return {
    kind: "function",
    describe: () => ({
      label: "transform function",
      values: Object.keys(TRANSFORM_FUNCTIONS).map((name) => `${name}(…)`),
    }),
    resolve(argument) {
      if (argument.type !== "call") return undefined;
      if (!Object.hasOwn(TRANSFORM_FUNCTIONS, argument.name)) return undefined;
      const css = TRANSFORM_FUNCTIONS[argument.name]!;
      if (argument.arguments.length === 0) return undefined;
      const parts: string[] = [];
      for (const part of argument.arguments) {
        if (part.type !== "word" || !TRANSFORM_ARGUMENT.test(part.value)) return undefined;
        parts.push(part.value);
      }
      return `${css}(${parts.join(", ")})`;
    },
  };
}

const FILTER_FUNCTIONS = [
  "blur",
  "brightness",
  "contrast",
  "grayscale",
  "hue-rotate",
  "invert",
  "opacity",
  "saturate",
  "sepia",
];

const FILTER_ARGUMENT = /^(\d+\.?\d*|\.\d+)(px|rem|em|%|deg|turn|rad)?$/;

/** A CSS filter function with one literal argument, e.g. `blur(4px)`. */
export function filterFunction(): ValueType {
  return {
    kind: "function",
    describe: () => ({
      label: "filter function",
      values: FILTER_FUNCTIONS.map((name) => `${name}(…)`),
    }),
    resolve(argument) {
      if (argument.type !== "call" || !FILTER_FUNCTIONS.includes(argument.name)) return undefined;
      const [value, ...rest] = argument.arguments;
      if (rest.length > 0 || value?.type !== "word" || !FILTER_ARGUMENT.test(value.value)) {
        return undefined;
      }
      return `${argument.name}(${value.value})`;
    },
  };
}

/** Colors accept tokens, a few keywords, `alpha()` and `var()`. */
export function color(): ValueType[] {
  const types: ValueType[] = [
    token("colors"),
    keywords({ transparent: "transparent", current: "currentColor", inherit: "inherit" }),
    cssVar(),
  ];
  types.push(alpha(() => types));
  return types;
}

const SIZE_KEYWORDS = {
  auto: "auto",
  full: "100%",
  min: "min-content",
  max: "max-content",
  fit: "fit-content",
};

/** Sizes accept spacing tokens, fractions, sizing keywords and `var()`. */
export function size(axis: "width" | "height", extra: Record<string, string> = {}): ValueType[] {
  return [
    token("spacing"),
    fraction(),
    keywords({ ...SIZE_KEYWORDS, screen: axis === "width" ? "100vw" : "100vh", ...extra }),
    cssVar(),
  ];
}

/** Spacing accepts spacing tokens and `var()`. */
export function spacing(options: { negative?: boolean; auto?: boolean } = {}): ValueType[] {
  const types: ValueType[] = [token("spacing", { negative: options.negative ?? false })];
  if (options.auto) types.push(words("auto"));
  types.push(cssVar());
  return types;
}

/** Offsets accept negative spacing tokens, fractions, `auto`, `full` and `var()`. */
export function offset(): ValueType[] {
  return [
    token("spacing", { negative: true }),
    fraction(),
    keywords({ auto: "auto", full: "100%" }),
    cssVar(),
  ];
}
