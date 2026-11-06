import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

// Browsers live inside node_modules, not in a global cache. See scripts/install-browsers.mjs.
process.env["PLAYWRIGHT_BROWSERS_PATH"] = "0";
const { chromium, firefox, webkit } = await import("playwright");

export type { Browser, Page } from "playwright";
import type { Page } from "playwright";

export const repository = fileURLToPath(new URL("../../", import.meta.url));

const ENGINES = { chromium, firefox, webkit };
export type EngineName = keyof typeof ENGINES;

/** All engines, or those listed in CROFF_BROWSERS, such as "chromium,firefox". */
export const engineNames = (process.env["CROFF_BROWSERS"] ?? "chromium,firefox,webkit").split(
  ",",
) as EngineName[];

export async function launch(name: EngineName) {
  try {
    return await ENGINES[name].launch();
  } catch (error) {
    throw new Error(
      `Couldn't start ${name}. Install the test browsers with "pnpm browsers:install".`,
      { cause: error },
    );
  }
}

/** Resizes the viewport and waits for media queries to catch up, which some engines do later. */
export async function resize(page: Page, width: number, height = 800): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.waitForFunction(
    (target) =>
      matchMedia(`(min-width: ${target}px)`).matches &&
      !matchMedia(`(min-width: ${target + 1}px)`).matches,
    width,
  );
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  );
}

/** Fails clearly if the build output a browser test needs is missing. */
export function requireBuilt(relativePath: string): string {
  const path = join(repository, relativePath);
  if (!existsSync(path)) {
    throw new Error(`${relativePath} doesn't exist. Run "pnpm build:all" first.`);
  }
  return path;
}

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

export interface StaticServer {
  url: string;
  close(): Promise<void>;
}

/** Serves a directory the way a static host does. */
export async function serveStatic(root: string): Promise<StaticServer> {
  const server: Server = createServer((request, response) => {
    const { pathname } = new URL(request.url ?? "/", "http://localhost");
    const path = normalize(join(root, decodeURIComponent(pathname)));
    const file = [path, join(path, "index.html")].find(
      (candidate) =>
        (candidate === root || candidate.startsWith(root + sep)) &&
        existsSync(candidate) &&
        statSync(candidate).isFile(),
    );
    if (!file) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(response);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
