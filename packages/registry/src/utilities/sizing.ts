import type { UtilityDefinition } from "../types.js";
import { keywords, ratio, size } from "../values.js";
import { simple } from "./helpers.js";

const category = "sizing";

function sizing(name: string, axis: "width" | "height", extra: Record<string, string> = {}) {
  return simple({
    name,
    category,
    description: `Sets the ${name.replace("-", " ")}.`,
    types: size(axis, extra),
    properties: [name],
    examples: [`${name}(full)`, `${name}(64)`, `md:${name}(1/2)`, `${name}[320px]`],
  });
}

export const sizingUtilities: UtilityDefinition[] = [
  sizing("width", "width"),
  sizing("height", "height"),
  sizing("min-width", "width"),
  sizing("max-width", "width", { none: "none" }),
  sizing("min-height", "height"),
  sizing("max-height", "height", { none: "none" }),
  simple({
    name: "aspect-ratio",
    category,
    description: "Sets the preferred width-to-height ratio.",
    types: [keywords({ auto: "auto", square: "1 / 1", video: "16 / 9" }), ratio()],
    properties: ["aspect-ratio"],
    examples: ["aspect-ratio(square)", "aspect-ratio(16/9)", "aspect-ratio[1.618]"],
  }),
];
