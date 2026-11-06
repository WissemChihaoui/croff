import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer, type ViteDevServer } from "vite";
import croff from "@croff/vite";
import { launch, type Browser } from "./helpers.js";

// The other Vite tests stop at the server. This one goes all the way to a page.
describe("Vite hot updates in a browser", () => {
  let root: string;
  let server: ViteDevServer;
  let browser: Browser;

  const write = async (path: string, content: string) => {
    const full = join(root, path);
    await mkdir(join(full, ".."), { recursive: true });
    await writeFile(full, content);
  };

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "croff-hot-"));
    await write(
      "index.html",
      `<!doctype html><div id="box" class="gap(4) padding-top[37px]"></div><script type="module" src="/src/main.js"></script>`,
    );
    await write("src/main.js", `import "./style.css";`);
    await write("src/style.css", `@croff;\n`);
    server = await createServer({
      root,
      configFile: false,
      plugins: [croff()],
      server: { port: 0 },
      logLevel: "silent",
    });
    await server.listen();
    browser = await launch("chromium");
  });

  afterEach(async () => {
    await browser.close();
    await server.close();
    await rm(root, { recursive: true, force: true });
  });

  it("delivers new utilities without reloading, and applies config edits", async () => {
    const address = server.resolvedUrls!.local[0]!;
    const page = await browser.newPage();
    // An update sent before the page's websocket is open is lost, so wait for it.
    const connected = page.waitForEvent("console", {
      predicate: (message) => message.text().includes("[vite] connected"),
    });
    await page.goto(address);
    await connected;
    const box = page.locator("#box");
    const style = (name: string) =>
      box.evaluate(
        (element, property) => getComputedStyle(element).getPropertyValue(property),
        name,
      );

    await expect.poll(() => style("padding-top")).toBe("37px");
    await page.evaluate(() => {
      (window as unknown as { marker: number }).marker = 1;
    });

    // The class is applied by script, and its CSS arrives once a source file mentions it.
    await box.evaluate((element) => element.classList.add("padding-left[41px]"));
    expect(await style("padding-left")).toBe("0px");
    await write("src/extra.js", `export const name = "padding-left[41px]";`);
    await expect.poll(() => style("padding-left"), { timeout: 15_000 }).toBe("41px");
    expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(1);

    // Removing the only use removes the rule.
    await rm(join(root, "src/extra.js"));
    await expect.poll(() => style("padding-left"), { timeout: 15_000 }).toBe("0px");

    // A config edit restarts the server, and the page picks up the new token.
    await expect.poll(() => style("row-gap")).toBe("16px");
    await write("croff.config.mjs", `export default { theme: { spacing: { 4: "23px" } } };`);
    await expect.poll(() => style("row-gap").catch(() => ""), { timeout: 20_000 }).toBe("23px");
  }, 60_000);
});
