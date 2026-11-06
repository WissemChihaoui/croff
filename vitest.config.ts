import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = (pkg: string, file = "index.ts") =>
  fileURLToPath(new URL(`./packages/${pkg}/src/${file}`, import.meta.url));

const packages = [
  "parser",
  "theme",
  "registry",
  "compiler",
  "scanner",
  "plugin-api",
  "core",
  "postcss",
  "vite",
];

export const aliases = [
  { find: "@croff/scanner/extract", replacement: src("scanner", "extract.ts") },
  { find: "@croff/core/node", replacement: src("core", "node.ts") },
  ...packages.map((pkg) => ({ find: `@croff/${pkg}`, replacement: src(pkg) })),
];

export default defineConfig({
  resolve: { alias: aliases },
  test: {
    include: [
      "packages/*/test/**/*.test.ts",
      "tests/integration/**/*.test.ts",
      "apps/docs/test/**/*.test.ts",
    ],
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
