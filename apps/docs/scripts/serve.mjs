// Serves the built site the way a static host does: "/a" serves "/a/index.html", and anything
// missing gets 404.html with a 404 status. "vite preview" isn't suitable here, because its SPA
// fallback answers every nested route with the landing page's HTML.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../dist/client");
const port = Number(process.argv[2] ?? 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".json": "application/json",
  ".map": "application/json",
};

function resolveFile(pathname) {
  const path = normalize(join(root, decodeURIComponent(pathname)));
  // normalize() resolves "..", so this keeps requests inside the build output.
  if (path !== root && !path.startsWith(root + sep)) return undefined;
  for (const candidate of [path, join(path, "index.html")]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return undefined;
}

createServer((request, response) => {
  const { pathname } = new URL(request.url, "http://localhost");
  let file;
  try {
    file = resolveFile(pathname);
  } catch {
    // A malformed percent-encoding in the path.
    file = undefined;
  }
  const found = file !== undefined;
  const served = file ?? join(root, "404.html");
  response.writeHead(found ? 200 : 404, {
    "Content-Type": TYPES[extname(served)] ?? "application/octet-stream",
  });
  createReadStream(served).pipe(response);
}).listen(port, () => {
  console.log(`Serving ${root} at http://localhost:${port}`);
});
