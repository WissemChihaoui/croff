import { sortedBreakpoints, type ResolvedTheme } from "@croff/theme";
import type { VariantDefinition } from "./types.js";

/**
 * A pseudo-element only renders with a content value. Reading it through a custom property lets
 * `content` set it from a rule of its own, whichever of the rules comes first.
 */
const EMPTY_CONTENT = { content: 'var(--croff-content, "")' };

/** State variants. Array order is cascade order: later variants override earlier ones. */
export const stateVariants: VariantDefinition[] = [
  {
    name: "group-hover",
    selector: ".group:hover &",
    description: 'Applies when an ancestor with the class "group" is hovered.',
  },
  {
    name: "first",
    selector: "&:first-child",
    description: "Applies when the element is the first child of its parent.",
  },
  {
    name: "last",
    selector: "&:last-child",
    description: "Applies when the element is the last child of its parent.",
  },
  { name: "hover", selector: "&:hover", description: "Applies when the element is hovered." },
  {
    name: "focus-within",
    selector: "&:focus-within",
    description: "Applies when the element or a descendant has focus.",
  },
  { name: "focus", selector: "&:focus", description: "Applies when the element has focus." },
  {
    name: "focus-visible",
    selector: "&:focus-visible",
    description: "Applies when the element has keyboard-visible focus.",
  },
  { name: "active", selector: "&:active", description: "Applies while the element is pressed." },
  {
    name: "disabled",
    selector: "&:disabled",
    description: "Applies when a form control is disabled.",
  },
  {
    name: "before",
    selector: "&::before",
    description: "Styles a generated box before the element's content. Renders empty by default.",
    declarations: EMPTY_CONTENT,
  },
  {
    name: "after",
    selector: "&::after",
    description: "Styles a generated box after the element's content. Renders empty by default.",
    declarations: EMPTY_CONTENT,
  },
];

/** Variants for what the visitor's device asks for. They sort after the breakpoints. */
export const preferenceVariants: VariantDefinition[] = [
  {
    name: "dark",
    atRule: "@media (prefers-color-scheme: dark)",
    description: "Applies when the visitor's system asks for a dark color scheme.",
  },
  {
    name: "motion-reduce",
    atRule: "@media (prefers-reduced-motion: reduce)",
    description: "Applies when the visitor has asked for less motion.",
  },
  {
    name: "print",
    atRule: "@media print",
    description: "Applies when the page is printed.",
  },
];

/** Responsive variants are derived from the theme, narrowest first. */
export function breakpointVariants(theme: ResolvedTheme): VariantDefinition[] {
  return sortedBreakpoints(theme).map(({ name, value, width }) => ({
    name,
    atRule: `@media (min-width: ${value})`,
    description: `Applies at viewport widths of ${value} and above.`,
    breakpoint: { width },
  }));
}
