import type { UtilityDefinition } from "../types.js";
import { integer, offset, words } from "../values.js";
import { simple } from "./helpers.js";

const category = "layout";

export const layoutUtilities: UtilityDefinition[] = [
  simple({
    name: "display",
    category,
    description: "Sets how an element is laid out.",
    types: [
      words(
        "block",
        "inline",
        "inline-block",
        "flex",
        "inline-flex",
        "grid",
        "inline-grid",
        "contents",
        "none",
      ),
    ],
    properties: ["display"],
    examples: ["display(grid)", "display(none)", "md:display(block)"],
  }),
  simple({
    name: "position",
    category,
    description: "Sets the positioning scheme.",
    types: [words("static", "relative", "absolute", "fixed", "sticky")],
    properties: ["position"],
    examples: ["position(relative)", "position(sticky)"],
  }),
  simple({
    name: "overflow",
    category,
    description: "Controls content that overflows its box.",
    types: [words("visible", "hidden", "clip", "scroll", "auto")],
    properties: ["overflow"],
    examples: ["overflow(hidden)", "overflow(auto)"],
  }),
  simple({
    name: "visibility",
    category,
    description: "Hides an element while keeping its space.",
    types: [words("visible", "hidden", "collapse")],
    properties: ["visibility"],
    examples: ["visibility(hidden)"],
  }),
  simple({
    name: "z-index",
    category,
    description: "Sets the stacking order.",
    types: [words("auto"), integer({ min: -9999, max: 9999 })],
    properties: ["z-index"],
    examples: ["z-index(10)", "z-index(-1)", "z-index(auto)"],
  }),
  simple({
    name: "inset",
    category,
    description: "Sets all four offsets of a positioned element.",
    types: offset(),
    properties: ["inset"],
    examples: ["inset(0)", "inset(4)", "inset[10%_auto]"],
  }),
  ...(["top", "right", "bottom", "left"] as const).map((side) =>
    simple({
      name: side,
      category,
      description: `Sets the ${side} offset of a positioned element.`,
      types: offset(),
      properties: [side],
      examples: [`${side}(0)`, `${side}(-2)`, `${side}(1/2)`, `${side}[3px]`],
    }),
  ),
];
