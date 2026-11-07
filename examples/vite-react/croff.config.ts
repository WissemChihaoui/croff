import { defineConfig } from "@croffcss/core";

export default defineConfig({
  content: ["src/**/*.tsx"],
  theme: {
    colors: {
      // A custom token, used as bg(surface).
      surface: "#141414",
    },
  },
});
