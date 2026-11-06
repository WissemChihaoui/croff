// Installs the browsers used by "pnpm test:browser". PLAYWRIGHT_BROWSERS_PATH=0 keeps them inside
// node_modules, instead of in a global cache, so that deleting node_modules removes them.
import { spawnSync } from "node:child_process";

const args = ["exec", "playwright", "install", "chromium", "firefox", "webkit"];
// CI machines also need the system libraries.
if (process.env.CI) args.push("--with-deps");

const { status } = spawnSync("pnpm", args, {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: "0" },
});
process.exit(status ?? 1);
