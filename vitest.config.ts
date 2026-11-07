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
  "ui",
];

export const aliases = [
  { find: "@croffcss/scanner/extract", replacement: src("scanner", "extract.ts") },
  { find: "@croffcss/core/node", replacement: src("core", "node.ts") },
  { find: "@croffcss/ui/plugin", replacement: src("ui", "plugin.ts") },
  { find: "@croffcss/ui/react", replacement: src("ui", "react/index.tsx") },
  ...packages.map((pkg) => ({ find: `@croffcss/${pkg}`, replacement: src(pkg) })),
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
