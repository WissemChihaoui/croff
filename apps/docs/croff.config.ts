import { defineConfig, definePlugin, values } from "@croffcss/core";
import { uiPlugin } from "@croffcss/ui/plugin";

// The documentation site is built with CROFF. This plugin adds what only the brand needs.
const brand = definePlugin({
  name: "croff-plugin-docs-brand",
  utilities: {
    stretch: {
      description: "Sets the font width on variable fonts with a width axis.",
      args: [{ name: "width", types: [values.keywords({ normal: "100%", wide: "125%" })] }],
      properties: ["font-stretch"],
    },
    "backdrop-blur": {
      description: "Blurs what is behind an element.",
      args: [
        {
          name: "radius",
          types: [values.integer({ min: 0, max: 64, format: (n) => `blur(${n}px)` })],
        },
      ],
      properties: ["backdrop-filter"],
    },
  },
});

export default defineConfig({
  content: ["src/**/*.tsx"],
  plugins: [uiPlugin, brand],
  variables: "all",
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
    },
    fonts: {
      sans: '"Inter Variable", ui-sans-serif, system-ui, sans-serif',
      mono: '"JetBrains Mono Variable", ui-monospace, Menlo, Consolas, monospace',
      display: '"Archivo Variable", "Inter Variable", ui-sans-serif, system-ui, sans-serif',
    },
    textSizes: {
      "7xl": "4.5rem",
      "8xl": "6rem",
    },
    letterSpacings: {
      tighter: "-0.035em",
    },
  },
});
