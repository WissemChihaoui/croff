import { sortedBreakpoints, type ResolvedTheme } from "@croff/theme";
import type { VariantDefinition } from "./types.js";

/** State variants. Array order is cascade order: later variants override earlier ones. */
export const stateVariants: VariantDefinition[] = [
  {
    name: "group-hover",
    selector: ".group:hover &",
    description: 'Applies when an ancestor with the class "group" is hovered.',
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
