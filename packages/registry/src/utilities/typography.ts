import type { UtilityDefinition } from "../types.js";
import { color, cssVar, token, words } from "../values.js";
import { simple } from "./helpers.js";

const category = "typography";

export const typographyUtilities: UtilityDefinition[] = [
  simple({
    name: "font",
    category,
    description: "Sets the font family.",
    types: [token("fonts"), cssVar()],
    properties: ["font-family"],
    examples: ["font(sans)", "font(mono)", "font['Inter',sans-serif]"],
  }),
  simple({
    name: "text-size",
    category,
    description: "Sets the font size.",
    types: [token("textSizes"), cssVar()],
    properties: ["font-size"],
    examples: ["text-size(lg)", "md:text-size(4xl)", "text-size[clamp(1rem,2vw,2rem)]"],
  }),
  simple({
    name: "text-weight",
    category,
    description: "Sets the font weight.",
    types: [token("textWeights"), cssVar()],
    properties: ["font-weight"],
    examples: ["text-weight(bold)", "text-weight[650]"],
  }),
  simple({
    name: "text-color",
    category,
    description: "Sets the text color. Exactly the same as color, which is the preferred name.",
    types: color(),
    properties: ["color"],
    examples: [
      "text-color(light)",
      "text-color(alpha(light,60))",
      "hover:text-color(brand)",
      "text-color[#ff00aa]",
    ],
  }),
  // Comes after text-color, so that the preferred name wins if both are used.
  simple({
    name: "color",
    category,
    description: "Sets the text color.",
    types: color(),
    properties: ["color"],
    examples: [
      "color(white)",
      "color(alpha(light,60))",
      "hover:color(brand)",
      "md:hover:color(brand)",
      "color(var(--accent))",
      "color[#ff00aa]",
    ],
    notes: "If both color and text-color apply to an element, color wins.",
  }),
  simple({
    name: "text-align",
    category,
    description: "Aligns text.",
    types: [words("left", "center", "right", "justify", "start", "end")],
    properties: ["text-align"],
    arbitrary: false,
    examples: ["text-align(center)", "md:text-align(left)"],
  }),
  simple({
    name: "line-height",
    category,
    description: "Sets the line height.",
    types: [token("lineHeights"), cssVar()],
    properties: ["line-height"],
    examples: ["line-height(tight)", "line-height[1.1]"],
  }),
  simple({
    name: "letter-spacing",
    category,
    description: "Sets the space between letters.",
    types: [token("letterSpacings"), cssVar()],
    properties: ["letter-spacing"],
    examples: ["letter-spacing(wide)", "letter-spacing[-0.04em]"],
  }),
  simple({
    name: "text-decoration",
    category,
    description: "Sets the text decoration line.",
    types: [words("none", "underline", "overline", "line-through")],
    properties: ["text-decoration-line"],
    arbitrary: false,
    examples: ["text-decoration(underline)", "hover:text-decoration(none)"],
  }),
  simple({
    name: "text-transform",
    category,
    description: "Changes text capitalization.",
    types: [words("none", "uppercase", "lowercase", "capitalize")],
    properties: ["text-transform"],
    arbitrary: false,
    examples: ["text-transform(uppercase)"],
  }),
  simple({
    name: "whitespace",
    category,
    description: "Controls how whitespace and wrapping behave.",
    types: [words("normal", "nowrap", "pre", "pre-line", "pre-wrap", "break-spaces")],
    properties: ["white-space"],
    arbitrary: false,
    examples: ["whitespace(nowrap)", "whitespace(pre-wrap)"],
  }),
];
