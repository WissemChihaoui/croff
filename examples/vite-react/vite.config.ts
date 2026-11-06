import react from "@vitejs/plugin-react";
import croff from "@croff/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), croff()],
});
