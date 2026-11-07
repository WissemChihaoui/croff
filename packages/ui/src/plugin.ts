import { definePlugin, values } from "@croffcss/core";

/** The logo's angled cut, taken from the top left and bottom right corners. */
const cut = (size: string) =>
  `polygon(${size} 0, 100% 0, 100% calc(100% - ${size}), calc(100% - ${size}) 100%, 0 100%, 0 ${size})`;

/**
 * The Chamfer design system as a CROFF plugin: its tokens, the `cut` utility and the variants
 * its components need. Add it to a project to write your own components in the same language.
 *
 * @unstable The plugin API may change between 0.x releases.
 */
export const uiPlugin = definePlugin({
  name: "@croffcss/ui",
  theme: {
    colors: {
      ink: "#0a0a0a",
      surface: "#111110",
      raised: "#1a1a18",
      line: "#262624",
      "line-strong": "#3d3d39",
      fg: "#f5f2f1",
      soft: "#bdbbb5",
      faint: "#8a8883",
      brand: "#c8fd12",
      "brand-dark": "#a4d30b",
      "on-brand": "#0a0a0a",
      accent: "#c8fd12",
      danger: "#ff6b61",
      "on-danger": "#0a0a0a",
      warning: "#ffb020",
      success: "#3ddc84",
      info: "#7cc0ff",
    },
    fonts: {
      sans: '"Inter Variable", ui-sans-serif, system-ui, sans-serif',
      mono: '"JetBrains Mono Variable", ui-monospace, Menlo, Consolas, monospace',
      display: '"Archivo Variable", "Inter Variable", ui-sans-serif, system-ui, sans-serif',
    },
    letterSpacings: {
      tighter: "-0.035em",
    },
  },
  utilities: {
    cut: {
      description: "Cuts two corners at the angle of the logo.",
      args: [
        {
          name: "size",
          types: [
            values.keywords({
              none: "none",
              xs: cut("0.25rem"),
              sm: cut("0.5rem"),
              md: cut("0.875rem"),
              lg: cut("2rem"),
            }),
          ],
        },
      ],
      properties: ["clip-path"],
    },
  },
  variants: {
    checked: { selector: "&:checked" },
    invalid: { selector: '&[aria-invalid="true"]' },
    selected: { selector: '&[aria-selected="true"]' },
    "group-open": { selector: "details[open] &" },
    placeholder: { selector: "&::placeholder" },
    backdrop: { selector: "&::backdrop" },
    "details-marker": { selector: "&::-webkit-details-marker" },
  },
});
