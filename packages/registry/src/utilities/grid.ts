import type { UtilityDefinition } from "../types.js";
import { integer, keywords, spacing } from "../values.js";
import { simple } from "./helpers.js";

const category = "grid";

function tracks(name: "columns" | "rows", property: string): UtilityDefinition {
  return simple({
    name,
    category,
    description: `Defines equal grid ${name}, or any template with brackets.`,
    types: [
      keywords({ none: "none", subgrid: "subgrid" }),
      integer({
        min: 1,
        max: 64,
        format: (count) => `repeat(${count}, minmax(0, 1fr))`,
        label: `number of ${name}, 1–64`,
      }),
    ],
    properties: [property],
    examples: [`${name}(3)`, `md:${name}(6)`, `${name}[200px_1fr]`],
  });
}

export const gridUtilities: UtilityDefinition[] = [
  tracks("columns", "grid-template-columns"),
  tracks("rows", "grid-template-rows"),
  simple({
    name: "gap",
    category,
    description: "Sets the space between grid or flex items.",
    types: spacing(),
    properties: ["gap"],
    examples: ["gap(4)", "md:gap(8)", "gap[1.5rem]"],
  }),
  simple({
    name: "column-gap",
    category,
    description: "Sets the space between columns.",
    types: spacing(),
    properties: ["column-gap"],
    examples: ["column-gap(4)", "column-gap[3vw]"],
  }),
  simple({
    name: "row-gap",
    category,
    description: "Sets the space between rows.",
    types: spacing(),
    properties: ["row-gap"],
    examples: ["row-gap(4)", "row-gap[3vh]"],
  }),
  simple({
    name: "grid-flow",
    category,
    description: "Controls how auto-placed items flow.",
    types: [
      keywords({
        row: "row",
        col: "column",
        dense: "dense",
        "row-dense": "row dense",
        "col-dense": "column dense",
      }),
    ],
    properties: ["grid-auto-flow"],
    arbitrary: false,
    examples: ["grid-flow(col)", "grid-flow(row-dense)"],
  }),
  {
    name: "grid-span",
    category,
    description: "Makes an item span columns, and optionally rows.",
    args: [
      {
        name: "columns",
        types: [
          keywords({ full: "1 / -1" }),
          integer({
            min: 1,
            max: 64,
            format: (count) => `span ${count} / span ${count}`,
            label: "span, 1–64",
          }),
        ],
      },
      {
        name: "rows",
        types: [
          keywords({ full: "1 / -1" }),
          integer({
            min: 1,
            max: 64,
            format: (count) => `span ${count} / span ${count}`,
            label: "span, 1–64",
          }),
        ],
        optional: true,
      },
    ],
    compile: ({ args }) => ({
      "grid-column": args[0]!,
      ...(args[1] ? { "grid-row": args[1] } : {}),
    }),
    arbitrary: ["grid-column"],
    examples: ["grid-span(2)", "grid-span(full)", "grid-span(2,3)", "grid-span[1_/_3]"],
  },
];
