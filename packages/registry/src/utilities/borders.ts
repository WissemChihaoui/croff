import type { Declarations, UtilityDefinition, UtilityInput } from "../types.js";
import { color, cssVar, integer, keywords, token, words } from "../values.js";
import { simple } from "./helpers.js";

const category = "borders";

const px = integer({
  min: 0,
  max: 64,
  format: (width) => (width === 0 ? "0" : `${width}px`),
  label: "width in px, 0–64",
});

function borderDeclarations(prefix: string) {
  return ({ args }: UtilityInput): Declarations => {
    const width = args[0] ?? "1px";
    if (width === "none") return { [prefix]: "none" };
    return {
      [`${prefix}-width`]: width,
      [`${prefix}-style`]: "solid",
      ...(args[1] ? { [`${prefix}-color`]: args[1] } : {}),
    };
  };
}

export const borderUtilities: UtilityDefinition[] = [
  {
    name: "border",
    category,
    description: "Adds a solid border, with an optional width and color.",
    args: [
      { name: "width", types: [words("none"), px], optional: true },
      { name: "color", types: color(), optional: true },
    ],
    compile: borderDeclarations("border"),
    arbitrary: ["border"],
    examples: [
      "border()",
      "border(2)",
      "border(1,muted)",
      "border(none)",
      "border[1px_dashed_#333]",
    ],
  },
  simple({
    name: "border-width",
    category,
    description: "Sets the border width only.",
    types: [px],
    properties: ["border-width"],
    examples: ["border-width(2)", "border-width[1px_0]"],
  }),
  simple({
    name: "border-color",
    category,
    description: "Sets the border color only.",
    types: color(),
    properties: ["border-color"],
    examples: ["border-color(muted)", "hover:border-color(brand)", "border-color[#333]"],
  }),
  simple({
    name: "border-style",
    category,
    description: "Sets the border style only.",
    types: [words("solid", "dashed", "dotted", "double", "none")],
    properties: ["border-style"],
    arbitrary: false,
    examples: ["border-style(dashed)"],
  }),
  ...(["top", "right", "bottom", "left"] as const).map((side): UtilityDefinition => ({
    name: `border-${side}`,
    category,
    description: `Adds a solid ${side} border, with an optional width and color.`,
    args: [
      { name: "width", types: [words("none"), px], optional: true },
      { name: "color", types: color(), optional: true },
    ],
    compile: borderDeclarations(`border-${side}`),
    arbitrary: [`border-${side}`],
    examples: [`border-${side}()`, `border-${side}(2,muted)`, `border-${side}[1px_dashed_#333]`],
  })),
  simple({
    name: "radius",
    category,
    description: "Rounds the corners.",
    types: [token("radius"), cssVar()],
    properties: ["border-radius"],
    examples: ["radius(md)", "radius(full)", "radius[3px_0]"],
  }),
  {
    name: "outline",
    category,
    description: "Adds an outline, with an optional width and color.",
    args: [
      { name: "width", types: [keywords({ none: "none" }), px], optional: true },
      { name: "color", types: color(), optional: true },
    ],
    compile: ({ args }): Declarations => {
      const width = args[0] ?? "1px";
      if (width === "none") return { outline: "2px solid transparent", "outline-offset": "2px" };
      return {
        "outline-width": width,
        "outline-style": "solid",
        ...(args[1] ? { "outline-color": args[1] } : {}),
      };
    },
    arbitrary: ["outline"],
    examples: ["outline(2)", "outline(2,brand)", "focus:outline(none)", "outline[1px_dotted_red]"],
    notes: "outline(none) keeps a transparent outline, so forced-colors mode still shows focus.",
  },
  simple({
    name: "outline-offset",
    category,
    description: "Sets the space between the outline and the border.",
    types: [
      integer({
        min: -64,
        max: 64,
        format: (width) => (width === 0 ? "0" : `${width}px`),
        label: "offset in px",
      }),
    ],
    properties: ["outline-offset"],
    examples: ["outline-offset(2)", "outline-offset[0.2em]"],
  }),
  {
    name: "ring",
    category,
    description: "Draws a solid ring around the element using box-shadow.",
    args: [
      { name: "width", types: [px] },
      { name: "color", types: color(), optional: true },
    ],
    compile: ({ args }) => ({
      "box-shadow": `0 0 0 ${args[0]} ${args[1] ?? "currentColor"}`,
    }),
    arbitrary: ["box-shadow"],
    examples: ["ring(2)", "focus:ring(2,brand)", "ring(2,alpha(brand,50))"],
    notes:
      "ring and shadow both set box-shadow and do not compose. ring wins when both apply, because it comes later in the output.",
  },
];
