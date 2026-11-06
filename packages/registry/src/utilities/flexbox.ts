import type { UtilityDefinition } from "../types.js";
import { cssVar, fraction, integer, keywords, token } from "../values.js";
import { simple } from "./helpers.js";

const category = "flexbox";

const directions = {
  row: "row",
  col: "column",
  "row-reverse": "row-reverse",
  "col-reverse": "column-reverse",
};

export const flexboxUtilities: UtilityDefinition[] = [
  {
    name: "flex",
    category,
    description: "Makes an element a flex container and optionally sets its direction.",
    args: [{ name: "direction", types: [keywords(directions)], optional: true }],
    compile: ({ args }) => ({
      display: "flex",
      ...(args[0] ? { "flex-direction": args[0] } : {}),
    }),
    arbitrary: false,
    examples: ["flex()", "flex(row)", "flex(col)", "md:flex(row-reverse)"],
  },
  simple({
    name: "flex-direction",
    category,
    description: "Sets direction only, for changing direction at a breakpoint.",
    types: [keywords(directions)],
    properties: ["flex-direction"],
    arbitrary: false,
    examples: ["flex-direction(col)", "md:flex-direction(row)"],
  }),
  simple({
    name: "flex-wrap",
    category,
    description: "Controls whether flex items wrap.",
    types: [keywords({ wrap: "wrap", nowrap: "nowrap", reverse: "wrap-reverse" })],
    properties: ["flex-wrap"],
    arbitrary: false,
    examples: ["flex-wrap(wrap)", "flex-wrap(nowrap)"],
  }),
  simple({
    name: "align",
    category,
    description: "Aligns items on the cross axis.",
    types: [
      keywords({
        start: "flex-start",
        center: "center",
        end: "flex-end",
        stretch: "stretch",
        baseline: "baseline",
      }),
    ],
    properties: ["align-items"],
    examples: ["align(center)", "align(start)", "align[last_baseline]"],
  }),
  simple({
    name: "justify",
    category,
    description: "Distributes items on the main axis.",
    types: [
      keywords({
        start: "flex-start",
        center: "center",
        end: "flex-end",
        between: "space-between",
        around: "space-around",
        evenly: "space-evenly",
      }),
    ],
    properties: ["justify-content"],
    examples: ["justify(between)", "justify(center)"],
  }),
  simple({
    name: "grow",
    category,
    description: "Sets how much a flex item grows.",
    types: [integer({ min: 0, max: 9999 })],
    properties: ["flex-grow"],
    examples: ["grow(1)", "grow(0)"],
  }),
  simple({
    name: "shrink",
    category,
    description: "Sets how much a flex item shrinks.",
    types: [integer({ min: 0, max: 9999 })],
    properties: ["flex-shrink"],
    examples: ["shrink(0)", "shrink(1)"],
  }),
  simple({
    name: "basis",
    category,
    description: "Sets a flex item's initial main size.",
    types: [
      token("spacing"),
      fraction(),
      keywords({ auto: "auto", full: "100%", content: "content" }),
      cssVar(),
    ],
    properties: ["flex-basis"],
    examples: ["basis(1/2)", "basis(64)", "basis(auto)", "basis[240px]"],
  }),
];
