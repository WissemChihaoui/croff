import type { UtilityDefinition } from "../types.js";
import { cssVar, fraction, integer, keywords, token, words } from "../values.js";
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
  simple({
    name: "order",
    category,
    description: "Sets where an item sits among its siblings.",
    types: [
      keywords({ first: "-9999", last: "9999", none: "0" }),
      integer({ min: -9999, max: 9999 }),
    ],
    properties: ["order"],
    examples: ["order(first)", "order(2)", "md:order(last)"],
  }),
  simple({
    name: "align-self",
    category,
    description: "Aligns one item on the cross axis.",
    types: [
      keywords({
        auto: "auto",
        start: "flex-start",
        center: "center",
        end: "flex-end",
        stretch: "stretch",
        baseline: "baseline",
      }),
    ],
    properties: ["align-self"],
    examples: ["align-self(center)", "align-self[last_baseline]"],
  }),
  simple({
    name: "align-content",
    category,
    description: "Distributes wrapped lines on the cross axis.",
    types: [
      keywords({
        start: "flex-start",
        center: "center",
        end: "flex-end",
        between: "space-between",
        around: "space-around",
        evenly: "space-evenly",
        stretch: "stretch",
      }),
    ],
    properties: ["align-content"],
    examples: ["align-content(between)", "align-content(center)"],
  }),
  simple({
    name: "justify-items",
    category,
    description: "Aligns grid items within their columns.",
    types: [words("start", "center", "end", "stretch")],
    properties: ["justify-items"],
    examples: ["justify-items(center)"],
  }),
  simple({
    name: "justify-self",
    category,
    description: "Aligns one grid item within its column.",
    types: [words("auto", "start", "center", "end", "stretch")],
    properties: ["justify-self"],
    examples: ["justify-self(end)"],
  }),
  simple({
    name: "place-items",
    category,
    description: "Sets align-items and justify-items together.",
    types: [words("start", "center", "end", "stretch")],
    properties: ["place-items"],
    examples: ["place-items(center)", "place-items[center_start]"],
  }),
  simple({
    name: "place-content",
    category,
    description: "Sets align-content and justify-content together.",
    types: [
      keywords({
        start: "start",
        center: "center",
        end: "end",
        between: "space-between",
        around: "space-around",
        evenly: "space-evenly",
        stretch: "stretch",
      }),
    ],
    properties: ["place-content"],
    examples: ["place-content(center)"],
  }),
  simple({
    name: "place-self",
    category,
    description: "Sets align-self and justify-self together.",
    types: [words("auto", "start", "center", "end", "stretch")],
    properties: ["place-self"],
    examples: ["place-self(center)"],
  }),
];
