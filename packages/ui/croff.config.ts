import { defineConfig } from "@croff/core";
import { uiPlugin } from "./src/plugin.ts";

// Every class lives in the recipes, so that is all this has to read. Emitting every token means
// that a project can override any of them, not only those this release happens to use.
export default defineConfig({
  content: ["src/recipes.ts"],
  plugins: [uiPlugin],
  variables: "all",
  input: "src/styles.css",
  output: "dist/styles.css",
});
