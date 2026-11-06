import type { UtilityDefinition } from "../types.js";
import { integer, keywords, spacing, words } from "../values.js";
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
  ...(
    [
      ["grid-auto-rows", "rows"],
      ["grid-auto-columns", "columns"],
    ] as const
  ).map(([name, tracks]) =>
    simple({
      name,
      category,
      description: `Sets the size of ${tracks} that are created automatically.`,
      types: [
        keywords({
          auto: "auto",
          min: "min-content",
          max: "max-content",
          fr: "minmax(0, 1fr)",
        }),
      ],
      properties: [name],
      examples: [`${name}(fr)`, `${name}(auto)`, `${name}[minmax(4rem,auto)]`],
    }),
  ),
  simple({
    name: "grid-row",
    category,
    description: "Makes an item span rows.",
    types: [
      keywords({ full: "1 / -1" }),
      integer({
        min: 1,
        max: 64,
        format: (count) => `span ${count} / span ${count}`,
        label: "span, 1–64",
      }),
    ],
    properties: ["grid-row"],
    examples: ["grid-row(2)", "grid-row(full)", "grid-row[1_/_3]"],
  }),
  simple({
    name: "grid-area",
    category,
    description: "Places an item in a named area, or between grid lines.",
    types: [words("auto")],
    properties: ["grid-area"],
    examples: ["grid-area(auto)", "grid-area[header]", "grid-area[1_/_2_/_3_/_4]"],
  }),
  simple({
    name: "grid-areas",
    category,
    description: "Names the areas of a grid.",
    types: [words("none")],
    properties: ["grid-template-areas"],
    examples: ["grid-areas(none)", "grid-areas['head_head'_'side_main']"],
  }),
];
