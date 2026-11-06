import type { ArgumentSpec, UtilityDefinition, ValueType } from "../types.js";
import { spacing } from "../values.js";
import { shorthand, simple } from "./helpers.js";

const category = "spacing";

function fourSides(types: ValueType[]): ArgumentSpec[] {
  return ["value", "value2", "value3", "value4"].map((name, index) => ({
    name,
    types,
    ...(index > 0 ? { optional: true } : {}),
  }));
}

function family(property: "padding" | "margin", types: ValueType[]): UtilityDefinition[] {
  const noun = property;
  const example = property === "margin" ? "auto" : "2";
  return [
    {
      name: property,
      category,
      description: `Sets ${noun} on all sides. Up to four values follow CSS shorthand order.`,
      args: fourSides(types),
      compile: ({ args }) => ({ [property]: shorthand(args) }),
      arbitrary: [property],
      examples: [
        `${property}(4)`,
        `${property}(4,8)`,
        `${property}(1,2,3,4)`,
        `md:${property}(8)`,
        `${property}[10px_5%]`,
      ],
    },
    simple({
      name: `${property}-x`,
      category,
      description: `Sets horizontal ${noun}.`,
      types,
      properties: [`${property}-left`, `${property}-right`],
      examples: [`${property}-x(4)`, `${property}-x(${example})`, `${property}-x[5vw]`],
    }),
    simple({
      name: `${property}-y`,
      category,
      description: `Sets vertical ${noun}.`,
      types,
      properties: [`${property}-top`, `${property}-bottom`],
      examples: [`${property}-y(4)`, `${property}-y(${example})`, `${property}-y[5vh]`],
    }),
    ...(["top", "right", "bottom", "left"] as const).map((side) =>
      simple({
        name: `${property}-${side}`,
        category,
        description: `Sets ${side} ${noun}.`,
        types,
        properties: [`${property}-${side}`],
        examples: [`${property}-${side}(4)`, `${property}-${side}[3px]`],
      }),
    ),
  ];
}

export const spacingUtilities: UtilityDefinition[] = [
  ...family("padding", spacing()),
  ...family("margin", spacing({ negative: true, auto: true })),
];
