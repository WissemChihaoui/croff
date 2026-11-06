import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// CROFF runs through postcss.config.mjs here, to exercise the PostCSS integration.
export default defineConfig({
  plugins: [react()],
});
