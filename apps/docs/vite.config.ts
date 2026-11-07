import react from "@vitejs/plugin-react";
import croff from "@croffcss/vite";
import { defineConfig } from "vite";
import { docsContent } from "./plugins/content.ts";

export default defineConfig({
  plugins: [react(), croff(), docsContent()],
});
