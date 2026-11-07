import { tokenNames, type ResolvedTheme, type ThemeIssue } from "@croffcss/theme";
import { buildRegistry, type Registry } from "./registry.js";
import type { UtilityDefinition } from "./types.js";
import { backgroundUtilities } from "./utilities/background.js";
import { borderUtilities } from "./utilities/borders.js";
import { effectUtilities } from "./utilities/effects.js";
import { flexboxUtilities } from "./utilities/flexbox.js";
import { gridUtilities } from "./utilities/grid.js";
import { layoutUtilities } from "./utilities/layout.js";
import { sizingUtilities } from "./utilities/sizing.js";
import { spacingUtilities } from "./utilities/spacing.js";
import { typographyUtilities } from "./utilities/typography.js";
import { behaviorUtilities, svgUtilities } from "./utilities/behavior.js";
import { preferenceVariants, stateVariants } from "./variants.js";

/**
 * Every built-in utility. Order matters: it is the cascade order of the
 * generated CSS, so general utilities come before specific ones.
 */
export const builtinUtilities: UtilityDefinition[] = [
  ...layoutUtilities,
  ...flexboxUtilities,
  ...gridUtilities,
  ...sizingUtilities,
  ...spacingUtilities,
  ...typographyUtilities,
  ...backgroundUtilities,
  ...borderUtilities,
  ...effectUtilities,
  ...behaviorUtilities,
  ...svgUtilities,
];

/** Documentation categories, in display order. */
export const utilityCategories = [
  "layout",
  "flexbox",
  "grid",
  "sizing",
  "spacing",
  "typography",
  "backgrounds",
  "borders",
  "effects",
  "behavior",
  "svg",
] as const;

/** Creates a registry holding the built-in utilities and variants for a theme. */
export function createRegistry(theme: ResolvedTheme): Registry {
  return buildRegistry(theme, builtinUtilities);
}

/**
 * Finds tokens that would change what the language means: a breakpoint named after a state
 * variant, or a token named after a keyword of a utility, which it would silently replace.
 */
export function reservedTokenIssues(theme: ResolvedTheme): ThemeIssue[] {
  const issues: ThemeIssue[] = [];
  for (const token of tokenNames(theme, "breakpoints")) {
    if ([...stateVariants, ...preferenceVariants].some((variant) => variant.name === token)) {
      issues.push({
        code: "reserved-token",
        scale: "breakpoints",
        token,
        message: `Breakpoint "${token}" has the same name as the "${token}:" variant. Rename the breakpoint.`,
      });
    }
  }

  const keywords = new Map<string, Map<string, string>>();
  for (const utility of builtinUtilities) {
    for (const { types } of utility.args ?? []) {
      const words = types
        .filter((type) => type.kind === "keyword")
        .flatMap((type) => type.describe(theme).values ?? []);
      for (const type of types) {
        const { scale } = type.describe(theme);
        if (type.kind !== "token" || !scale) continue;
        const reserved = keywords.get(scale) ?? new Map<string, string>();
        keywords.set(scale, reserved);
        for (const word of words) if (!reserved.has(word)) reserved.set(word, utility.name);
      }
    }
  }
  for (const [scale, reserved] of keywords) {
    for (const token of tokenNames(theme, scale)) {
      const utility = reserved.get(token);
      if (utility) {
        issues.push({
          code: "reserved-token",
          scale,
          token,
          message: `Token "${token}" in "${scale}" would replace a keyword of utilities like ${utility}(${token}). Rename the token.`,
        });
      }
    }
  }
  return issues;
}

export { normalizeArbitraryValue, spaceMathOperators } from "./arbitrary.js";
export { RegistrationError, Registry, type RegisterOptions } from "./registry.js";
export { closest } from "./suggest.js";
export type {
  ArgumentSpec,
  Declarations,
  ResolveContext,
  ResolvedUtility,
  ResolveError,
  ResolveErrorCode,
  UtilityDefinition,
  UtilityInput,
  ValueDescription,
  ValueType,
  VariantDefinition,
} from "./types.js";
export * as values from "./values.js";
export { breakpointVariants, preferenceVariants, stateVariants } from "./variants.js";
