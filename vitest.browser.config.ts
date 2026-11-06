import { defineConfig } from "vitest/config";
import { aliases } from "./vitest.config.ts";

// Real browsers: "pnpm test:browser", after "pnpm browsers:install" and "pnpm build:all".
export default defineConfig({
  resolve: { alias: aliases },
  test: {
    include: ["tests/browser/**/*.test.ts"],
    globals: true,
    testTimeout: 60_000,
    // The default of one second is too short for a slow engine on a busy machine.
    expect: { poll: { timeout: 10_000 } },
    hookTimeout: 120_000,
    // Browsers are heavy. One file at a time keeps timing-sensitive tests reliable.
    fileParallelism: false,
  },
});
