import { defineConfig, definePlugin, values } from "@croffcss/core";

// A small local plugin: a utility, a variant and a token.
const clampText = definePlugin({
  name: "croff-plugin-showcase",
  theme: {
    colors: { surface: "#141414" },
  },
  utilities: {
    "line-clamp": {
      description: "Truncates text after a number of lines.",
      args: [{ name: "lines", types: [values.integer({ min: 1, max: 12 })] }],
      compile: ({ args }) => ({
        display: "-webkit-box",
        "-webkit-box-orient": "vertical",
        "-webkit-line-clamp": args[0]!,
        overflow: "hidden",
      }),
    },
  },
});

export default defineConfig({
  content: ["src/**/*.tsx"],
  plugins: [clampText],
});
