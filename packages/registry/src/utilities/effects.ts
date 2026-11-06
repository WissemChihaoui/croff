import { hasToken } from "@croff/theme";
import type { Declarations, UtilityDefinition } from "../types.js";
import { cssVar, integer, keywords, token, transformFunction, words } from "../values.js";
import { simple } from "./helpers.js";

const category = "effects";

const TRANSITION_PROPERTIES: Record<string, string> = {
  all: "all",
  colors:
    "color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
  opacity: "opacity",
  shadow: "box-shadow",
  transform: "transform",
};

export const effectUtilities: UtilityDefinition[] = [
  simple({
    name: "shadow",
    category,
    description: "Adds a box shadow.",
    types: [token("shadows"), keywords({ none: "none" }), cssVar()],
    properties: ["box-shadow"],
    examples: ["shadow(md)", "shadow(none)", "shadow[0_0_40px_#c8fd12]"],
  }),
  simple({
    name: "opacity",
    category,
    description: "Sets opacity as a percentage.",
    types: [
      integer({
        min: 0,
        max: 100,
        format: (value) => String(value / 100),
        label: "percentage, 0–100",
      }),
    ],
    properties: ["opacity"],
    examples: ["opacity(50)", "disabled:opacity(50)", "opacity[0.125]"],
  }),
  simple({
    name: "cursor",
    category,
    description: "Sets the mouse cursor.",
    types: [
      words(
        "auto",
        "default",
        "pointer",
        "wait",
        "text",
        "move",
        "help",
        "not-allowed",
        "none",
        "grab",
        "grabbing",
      ),
    ],
    properties: ["cursor"],
    examples: ["cursor(pointer)", "disabled:cursor(not-allowed)", "cursor[url(/c.png),auto]"],
  }),
  {
    name: "transition",
    category,
    description: "Animates changes to a group of properties, using the normal duration.",
    args: [
      {
        name: "properties",
        types: [keywords({ none: "none", ...TRANSITION_PROPERTIES })],
      },
    ],
    compile: ({ args, context }): Declarations =>
      args[0] === "none"
        ? { "transition-property": "none" }
        : {
            "transition-property": args[0]!,
            "transition-duration": hasToken(context.theme, "durations", "normal")
              ? context.useToken("durations", "normal")
              : "200ms",
            "transition-timing-function": "cubic-bezier(0.4, 0, 0.2, 1)",
          },
    arbitrary: ["transition"],
    examples: [
      "transition(colors)",
      "transition(all)",
      "transition(none)",
      "transition[width_1s_linear]",
    ],
  },
  simple({
    name: "duration",
    category,
    description: "Sets the transition duration from a token, or a whole number of milliseconds.",
    types: [
      token("durations"),
      integer({ min: 0, max: 60000, format: (ms) => `${ms}ms`, label: "milliseconds" }),
      cssVar(),
    ],
    properties: ["transition-duration"],
    examples: ["duration(fast)", "duration(350)", "duration[1.5s]"],
  }),
  {
    name: "transform",
    category,
    description: "Applies one or more transform functions.",
    args: [
      {
        name: "functions",
        types: [words("none"), transformFunction(), cssVar()],
        variadic: true,
      },
    ],
    compile: ({ args }) => ({ transform: args.join(" ") }),
    arbitrary: ["transform"],
    examples: [
      "transform(rotate(45deg))",
      "hover:transform(translate-y(-2px),scale(1.02))",
      "transform(none)",
      "transform[perspective(100px)_rotateX(5deg)]",
    ],
    notes:
      "Transform functions in the call form are limited to literal numbers. Use brackets for anything else. To scale and nothing else, scale is shorter.",
  },
  // Comes after transform, so that the concise form wins if both are used.
  {
    name: "scale",
    category,
    description: "Scales an element, as a percentage: scale(105) is 1.05 times its size.",
    args: [
      {
        name: "percent",
        types: [
          integer({
            min: -1000,
            max: 1000,
            format: (percent) => String(percent / 100),
            label: "percentage, -1000–1000",
          }),
          cssVar(),
        ],
      },
    ],
    compile: ({ args }) => ({ transform: `scale(${args[0]})` }),
    arbitrary: (value) => ({ transform: `scale(${value})` }),
    examples: [
      "scale(105)",
      "scale(95)",
      "hover:scale(105)",
      "md:hover:scale(110)",
      "scale(var(--zoom))",
      "scale[1.05]",
      "scale[1.2,0.8]",
    ],
    notes:
      "scale and transform both set the transform property, so they don't combine. If both apply, scale wins. To scale and rotate together, use transform(scale(1.05),rotate(5deg)). Inside transform, the scale function takes a factor, not a percentage.",
  },
];
