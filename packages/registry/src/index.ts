import type { ResolvedTheme } from "@croff/theme";
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
] as const;

/** Creates a registry holding the built-in utilities and variants for a theme. */
export function createRegistry(theme: ResolvedTheme): Registry {
  return buildRegistry(theme, builtinUtilities);
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
export { breakpointVariants, stateVariants } from "./variants.js";
