import { globSync, rmSync } from "node:fs";

// Removes build output only; never touches source or node_modules.
const targets = ["packages/*/dist", "packages/*/*.tsbuildinfo", "apps/*/dist", "examples/*/dist"];
for (const pattern of targets) {
  for (const path of globSync(pattern)) {
    rmSync(path, { recursive: true, force: true });
    console.log(`removed ${path}`);
  }
}
