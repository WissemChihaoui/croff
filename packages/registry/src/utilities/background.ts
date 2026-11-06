import type { UtilityDefinition } from "../types.js";
import { color, cssVar, keywords, words } from "../values.js";
import { simple } from "./helpers.js";

const category = "backgrounds";

export const backgroundUtilities: UtilityDefinition[] = [
  simple({
    name: "bg",
    category,
    description:
      "Sets the background. The call form sets background-color; the bracket form sets the background shorthand.",
    types: color(),
    properties: ["background-color"],
    arbitrary: ["background"],
    examples: [
      "bg(brand)",
      "bg(alpha(brand,20))",
      "hover:bg(brand-dark)",
      "bg[#121212]",
      "bg[linear-gradient(90deg,#000,#333)]",
    ],
    notes:
      "Use bg-color when you need a raw color that must not reset other background properties.",
  }),
  simple({
    name: "bg-color",
    category,
    description: "Sets background-color in both forms, never the shorthand.",
    types: color(),
    properties: ["background-color"],
    examples: ["bg-color(dark)", "bg-color[oklch(70%_0.2_120)]"],
  }),
  simple({
    name: "bg-image",
    category,
    description: "Sets the background image.",
    types: [words("none"), cssVar()],
    properties: ["background-image"],
    examples: ["bg-image(none)", "bg-image[url(/hero.png)]"],
  }),
  simple({
    name: "bg-size",
    category,
    description: "Sets the background image size.",
    types: [words("auto", "cover", "contain")],
    properties: ["background-size"],
    examples: ["bg-size(cover)", "bg-size[50%_auto]"],
  }),
  simple({
    name: "bg-position",
    category,
    description: "Sets the background image position.",
    types: [
      keywords({
        center: "center",
        top: "top",
        right: "right",
        bottom: "bottom",
        left: "left",
      }),
    ],
    properties: ["background-position"],
    examples: ["bg-position(center)", "bg-position[10%_20%]"],
  }),
  simple({
    name: "bg-repeat",
    category,
    description: "Sets how a background image repeats.",
    types: [
      keywords({
        repeat: "repeat",
        none: "no-repeat",
        x: "repeat-x",
        y: "repeat-y",
        round: "round",
        space: "space",
      }),
    ],
    properties: ["background-repeat"],
    arbitrary: false,
    examples: ["bg-repeat(none)", "bg-repeat(x)"],
  }),
  simple({
    name: "bg-clip",
    category,
    description: "Sets how far a background extends. Use text for gradient text.",
    types: [
      keywords({
        border: "border-box",
        padding: "padding-box",
        content: "content-box",
        text: "text",
      }),
    ],
    properties: ["background-clip"],
    arbitrary: false,
    examples: ["bg-clip(text)", "bg-clip(padding)"],
  }),
  simple({
    name: "bg-attachment",
    category,
    description: "Sets whether a background image scrolls with the page.",
    types: [words("scroll", "fixed", "local")],
    properties: ["background-attachment"],
    arbitrary: false,
    examples: ["bg-attachment(fixed)"],
  }),
];
