// Renders every route to static HTML using the server bundle.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const clientDir = join(root, "dist/client");
const serverEntry = join(root, "dist/server/entry-server.js");

const { render, allRoutes } = await import(pathToFileURL(serverEntry).href);
const template = readFileSync(join(clientDir, "index.html"), "utf8");

const pageHtml = (page) =>
  template
    .replace("<title>CROFF</title>", "")
    .replace("<!--head-->", () => page.head)
    .replace("<!--app-->", () => page.html);

for (const route of allRoutes()) {
  const page = await render(route);
  const out = route === "/" ? "index.html" : join(route.slice(1), "index.html");
  const file = join(clientDir, out);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, pageHtml(page));
}
writeFileSync(join(clientDir, "404.html"), pageHtml(await render("/404")));

rmSync(join(root, "dist/server"), { recursive: true, force: true });
console.log(`Prerendered ${allRoutes().length} routes`);
