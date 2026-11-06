import type { UtilityDefinition } from "../types.js";
import { color, integer, keywords, words } from "../values.js";
import { simple } from "./helpers.js";

const category = "behavior";

export const behaviorUtilities: UtilityDefinition[] = [
  simple({
    name: "pointer-events",
    category,
    description: "Sets whether an element reacts to the mouse.",
    types: [words("auto", "none")],
    properties: ["pointer-events"],
    arbitrary: false,
    examples: ["pointer-events(none)", "disabled:pointer-events(none)"],
  }),
  simple({
    name: "user-select",
    category,
    description: "Sets whether text can be selected.",
    types: [words("auto", "none", "text", "all")],
    properties: ["user-select"],
    arbitrary: false,
    examples: ["user-select(none)", "user-select(all)"],
  }),
  simple({
    name: "resize",
    category,
    description: "Sets whether the visitor can resize an element.",
    types: [keywords({ none: "none", both: "both", x: "horizontal", y: "vertical" })],
    properties: ["resize"],
    arbitrary: false,
    examples: ["resize(none)", "resize(y)"],
  }),
  simple({
    name: "appearance",
    category,
    description: "Removes a form control's native styling.",
    types: [words("none", "auto")],
    properties: ["appearance"],
    arbitrary: false,
    examples: ["appearance(none)"],
  }),
  simple({
    name: "accent-color",
    category,
    description: "Sets the color of checkboxes, radio buttons and other native controls.",
    types: color(),
    properties: ["accent-color"],
    examples: ["accent-color(brand)", "accent-color[#ff00aa]"],
  }),
  simple({
    name: "caret-color",
    category,
    description: "Sets the color of the text cursor.",
    types: color(),
    properties: ["caret-color"],
    examples: ["caret-color(brand)", "caret-color[#ff00aa]"],
  }),
  simple({
    name: "scroll-behavior",
    category,
    description: "Sets whether scrolling to an anchor is animated.",
    types: [words("auto", "smooth")],
    properties: ["scroll-behavior"],
    arbitrary: false,
    examples: ["scroll-behavior(smooth)", "motion-reduce:scroll-behavior(auto)"],
  }),
  simple({
    name: "touch-action",
    category,
    description: "Sets which touch gestures the browser handles.",
    types: [words("auto", "none", "manipulation", "pan-x", "pan-y", "pinch-zoom")],
    properties: ["touch-action"],
    examples: ["touch-action(manipulation)", "touch-action[pan-x_pinch-zoom]"],
  }),
  simple({
    name: "scroll-snap-type",
    category,
    description: "Makes a scroll container snap to its children.",
    types: [
      keywords({
        none: "none",
        x: "x mandatory",
        y: "y mandatory",
        both: "both mandatory",
        "x-proximity": "x proximity",
        "y-proximity": "y proximity",
      }),
    ],
    properties: ["scroll-snap-type"],
    arbitrary: false,
    examples: ["scroll-snap-type(x)", "scroll-snap-type(y-proximity)"],
  }),
  simple({
    name: "scroll-snap-align",
    category,
    description: "Sets where a child snaps in its scroll container.",
    types: [words("none", "start", "center", "end")],
    properties: ["scroll-snap-align"],
    arbitrary: false,
    examples: ["scroll-snap-align(start)"],
  }),
];

export const svgUtilities: UtilityDefinition[] = (
  [
    ["fill", "Sets the fill color of an SVG shape."],
    ["stroke", "Sets the outline color of an SVG shape."],
  ] as const
)
  .map(([name, description]) =>
    simple({
      name,
      category: "svg",
      description,
      types: [words("none"), ...color()],
      properties: [name],
      examples: [`${name}(brand)`, `${name}(none)`, `hover:${name}(light)`, `${name}[#ff00aa]`],
    }),
  )
  .concat(
    simple({
      name: "stroke-width",
      category: "svg",
      description: "Sets the outline width of an SVG shape.",
      types: [integer({ min: 0, max: 64 })],
      properties: ["stroke-width"],
      examples: ["stroke-width(2)", "stroke-width[1.5]"],
    }),
  );
