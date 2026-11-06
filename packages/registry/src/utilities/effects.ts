import { hasToken } from "@croff/theme";
import type { Declarations, UtilityDefinition, UtilityInput } from "../types.js";
import {
  cssVar,
  filterFunction,
  integer,
  keywords,
  token,
  transformFunction,
  words,
} from "../values.js";
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
  ...(["filter", "backdrop-filter"] as const).map((name) => ({
    name,
    category,
    description:
      name === "filter"
        ? "Applies graphical filters to an element."
        : "Applies graphical filters to what is behind an element.",
    args: [
      {
        name: "functions",
        types: [words("none"), filterFunction(), cssVar()],
        variadic: true,
      },
    ],
    compile: ({ args }: UtilityInput): Declarations => ({ [name]: args.join(" ") }),
    arbitrary: [name],
    examples: [
      `${name}(blur(4px))`,
      `hover:${name}(brightness(110%),saturate(120%))`,
      `${name}(none)`,
      `${name}[drop-shadow(0_0_4px_#000)]`,
    ],
    notes:
      "Each filter function in the call form takes one literal number. Use brackets for anything else.",
  })),
  simple({
    name: "mix-blend",
    category,
    description: "Sets how an element blends with what is behind it.",
    types: [
      words(
        "normal",
        "multiply",
        "screen",
        "overlay",
        "darken",
        "lighten",
        "color-dodge",
        "color-burn",
        "difference",
        "exclusion",
      ),
    ],
    properties: ["mix-blend-mode"],
    arbitrary: false,
    examples: ["mix-blend(multiply)"],
  }),
  simple({
    name: "clip-path",
    category,
    description: "Clips an element to a shape.",
    types: [words("none")],
    properties: ["clip-path"],
    examples: ["clip-path(none)", "clip-path[circle(50%)]"],
  }),
  simple({
    name: "mask-image",
    category,
    description: "Masks an element with an image or gradient.",
    types: [words("none")],
    properties: ["mask-image"],
    examples: ["mask-image(none)", "mask-image[linear-gradient(black,transparent)]"],
  }),
  simple({
    name: "animation",
    category,
    description: "Runs a CSS animation. Define its @keyframes in your own stylesheet.",
    types: [words("none")],
    properties: ["animation"],
    examples: [
      "animation[spin_1s_linear_infinite]",
      "animation(none)",
      "motion-reduce:animation(none)",
    ],
    notes:
      "CROFF doesn't generate keyframes. Write them beside the @croff directive in your stylesheet, and name them here.",
  }),
  simple({
    name: "delay",
    category,
    description: "Sets the transition delay from a token, or a whole number of milliseconds.",
    types: [
      token("durations"),
      integer({ min: 0, max: 60000, format: (ms) => `${ms}ms`, label: "milliseconds" }),
      cssVar(),
    ],
    properties: ["transition-delay"],
    examples: ["delay(fast)", "delay(150)", "delay[1.5s]"],
  }),
  simple({
    name: "ease",
    category,
    description: "Sets the transition timing function.",
    types: [
      keywords({
        linear: "linear",
        in: "cubic-bezier(0.4, 0, 1, 1)",
        out: "cubic-bezier(0, 0, 0.2, 1)",
        "in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
      }),
    ],
    properties: ["transition-timing-function"],
    examples: ["ease(out)", "ease(linear)", "ease[steps(4)]"],
  }),
  simple({
    name: "transform-origin",
    category,
    description: "Sets the point an element transforms around.",
    types: [
      keywords({
        center: "center",
        top: "top",
        right: "right",
        bottom: "bottom",
        left: "left",
        "top-left": "top left",
        "top-right": "top right",
        "bottom-left": "bottom left",
        "bottom-right": "bottom right",
      }),
    ],
    properties: ["transform-origin"],
    examples: ["transform-origin(top-left)", "transform-origin[25%_75%]"],
  }),
  simple({
    name: "will-change",
    category,
    description: "Tells the browser what is about to animate.",
    types: [words("auto", "transform", "opacity", "scroll-position", "contents")],
    properties: ["will-change"],
    examples: ["will-change(transform)", "will-change[top,left]"],
  }),
  {
    name: "content",
    category,
    description: "Sets the text of a before: or after: box. Quote text inside the brackets.",
    args: [{ name: "value", types: [keywords({ none: "none", empty: '""' })] }],
    compile: ({ args }): Declarations => ({
      "--croff-content": args[0]!,
      content: "var(--croff-content)",
    }),
    arbitrary: (value): Declarations => ({
      "--croff-content": value,
      content: "var(--croff-content)",
    }),
    examples: ["after:content['→']", "before:content(empty)", "before:content(none)"],
    notes: "before: and after: already render an empty box, so you only need this to add text.",
  },
];
