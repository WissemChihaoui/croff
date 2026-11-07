import react from "@vitejs/plugin-react";
import croff from "@croffcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), croff()],
});
