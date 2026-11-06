import { spawn, type ChildProcess } from "node:child_process";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { builtinUtilities } from "@croff/core";
import { allRoutes } from "../../apps/docs/src/nav.js";
import {
  engineNames,
  launch,
  repository,
  requireBuilt,
  type Browser,
  type Page,
} from "./helpers.js";

const PORT = 4177;
const BASE = `http://127.0.0.1:${PORT}`;

let server: ChildProcess;

beforeAll(async () => {
  requireBuilt("apps/docs/dist/client/index.html");
  server = spawn(process.execPath, [join(repository, "apps/docs/scripts/serve.mjs"), String(PORT)]);
  const deadline = Date.now() + 10_000;
  for (;;) {
    try {
      if ((await fetch(BASE)).status === 200) break;
    } catch {
      if (Date.now() > deadline) throw new Error("The documentation server didn't start.");
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
});

afterAll(() => {
  server.kill();
});

/** Opens a page and collects everything that goes wrong in it. */
async function open(browser: Browser, path: string, viewport = { width: 1440, height: 900 }) {
  const page = await browser.newPage({ viewport });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`${path}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" || message.text().includes("hydrat")) {
      errors.push(`${path}: ${message.text()}`);
    }
  });
  await page.goto(BASE + path);
  await hydrated(page);
  return { page, errors };
}

function hydrated(page: Page) {
  return page.waitForFunction(() => {
    const root = document.getElementById("root");
    return root && Object.keys(root).some((key) => key.startsWith("__reactContainer"));
  });
}

const setValue = (page: Page, selector: string, value: string) =>
  page.locator(selector).fill(value);

describe("every route", () => {
  it("hydrates without an error in Chromium", async () => {
    const browser = await launch("chromium");
    const problems: string[] = [];
    try {
      for (const route of allRoutes()) {
        const { page, errors } = await open(browser, route);
        // Give a failed hydration time to report itself.
        await page.waitForTimeout(150);
        problems.push(...errors);
        await page.close();
      }
    } finally {
      await browser.close();
    }
    expect(problems).toEqual([]);
  }, 180_000);
});

describe.each(engineNames)("documentation site in %s", (engine) => {
  let browser: Browser;

  beforeAll(async () => {
    browser = await launch(engine);
  });

  afterAll(async () => {
    await browser.close();
  });

  it("hydrates a sample of routes", async () => {
    const problems: string[] = [];
    for (const route of ["/", "/playground", "/docs/concepts/variants", "/docs/utilities/grid"]) {
      const { page, errors } = await open(browser, route);
      await page.waitForTimeout(200);
      problems.push(...errors);
      await page.close();
    }
    expect(problems).toEqual([]);
  });

  it("renders the brand: logo, font and color", async () => {
    const { page } = await open(browser, "/");
    expect(await page.locator("h1").textContent()).toBe("Style without the noise.");
    expect(
      await page
        .locator("header img")
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    ).toBeGreaterThan(0);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.fonts.check('700 40px "Archivo Variable"'))).toBe(
      true,
    );
    const cta = page.getByRole("link", { name: "Get started" }).first();
    expect(await cta.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
      "rgb(200, 253, 18)",
    );
    await page.close();
  });

  it("recompiles the landing page's live example", async () => {
    const { page } = await open(browser, "/");
    await page.locator("main textarea").fill('<a class="width[33px] md:hover:bg(brand)">x</a>');
    const output = page.locator("main").locator("pre code", { hasText: "width: 33px" });
    await expect.poll(() => output.count()).toBeGreaterThan(0);
    expect(await output.first().textContent()).toContain("@media (min-width: 768px)");
    await page.close();
  });

  it("navigates without reloading", async () => {
    const { page } = await open(browser, "/");
    await page.evaluate(() => {
      (window as unknown as { marker: number }).marker = 1;
    });
    await page.getByRole("link", { name: "Explore documentation" }).click();
    await page.waitForURL("**/docs/introduction/what-is-croff");
    await expect.poll(() => page.locator("h1").textContent()).toBe("What is CROFF?");
    expect(await page.title()).toContain("What is CROFF?");

    // A plain link inside Markdown.
    await page.locator('.prose a[href="/docs/getting-started/installation"]').first().click();
    await page.waitForURL("**/docs/getting-started/installation");
    await expect
      .poll(() =>
        page
          .locator('aside [aria-current=page][href="/docs/getting-started/installation"]')
          .count(),
      )
      .toBe(1);

    await page.goBack();
    await page.waitForURL("**/docs/introduction/what-is-croff");
    await expect.poll(() => page.locator("h1").textContent()).toBe("What is CROFF?");
    await page
      .getByRole("navigation", { name: "Pagination" })
      .getByRole("link", { name: /Philosophy/ })
      .click();
    await page.waitForURL("**/docs/introduction/philosophy");
    expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(1);
    await page.close();
  });

  it("searches, including utilities", async () => {
    const { page } = await open(browser, "/docs/introduction/what-is-croff");
    // Headless WebKit only sends key events to a page that has been interacted with.
    await page.locator("h1").click();
    await page.keyboard.press("Control+k");
    const input = page.getByRole("dialog").getByRole("searchbox");
    await input.waitFor();
    await input.fill("padding-x");
    await expect
      .poll(() => page.getByRole("option").first().locator("a").getAttribute("href"))
      .toBe("/docs/utilities/spacing#padding-x");
    await input.press("Enter");
    await page.waitForURL("**/docs/utilities/spacing#padding-x");
    await expect
      .poll(() =>
        page.locator("#padding-x").evaluate((heading) => heading.getBoundingClientRect().top),
      )
      .toBeLessThan(300);

    // Escape closes, and the button opens.
    await page.getByRole("button", { name: "Search the documentation" }).click();
    await page.getByRole("dialog").getByRole("searchbox").press("Escape");
    expect(await page.getByRole("dialog").count()).toBe(0);
    await page.close();
  });

  it("reports the result of copying code", async () => {
    const { page } = await open(browser, "/docs/concepts/variants");
    const button = page.locator("[data-copy]").first();
    await button.click();
    await expect.poll(() => button.textContent()).toMatch(/^Copied$|^Copy failed$/);
    await page.close();
  });

  it("shows the table of contents and follows scrolling", async () => {
    const { page } = await open(browser, "/docs/concepts/variants");
    const nav = page.getByRole("navigation", { name: "On this page" });
    expect(await nav.getByRole("link").count()).toBeGreaterThan(3);
    const color = (name: string) =>
      nav
        .getByRole("link", { name, exact: true })
        .evaluate((element) => getComputedStyle(element).color);

    await page
      .locator("#how-conflicts-are-decided")
      .evaluate((heading) => heading.scrollIntoView());
    await expect.poll(() => color("How conflicts are decided")).toBe("rgb(200, 253, 18)");

    // The last section is too short to reach the top, so the end of the page selects it.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => color("Custom variants")).toBe("rgb(200, 253, 18)");
    await page.close();
  });

  it("generates the utility reference from the registry", async () => {
    const { page } = await open(browser, "/docs/utilities/spacing");
    const inCategory = builtinUtilities.filter((utility) => utility.category === "spacing");
    for (const utility of inCategory) {
      expect(await page.locator(`[id="${utility.name}"]`).count(), utility.name).toBe(1);
    }
    expect(await page.locator("main").textContent()).toContain("Generated CSS");
    await page.close();
  });

  describe("playground", () => {
    const output = (page: Page) =>
      page.locator("section[aria-label=Output] code").first().textContent();
    const preview = (page: Page) =>
      page.locator("section[aria-label=Preview] iframe").getAttribute("srcdoc");
    const markup = "section[aria-label=Markup] textarea";

    it("compiles what you type, and renders it in the preview", async () => {
      const { page } = await open(browser, "/playground");
      await expect.poll(() => output(page)).toContain("--croff-color-brand: #c8fd12");
      await setValue(
        page,
        markup,
        '<p id="p" class="bg(brand) gap[7px] lg:hover:opacity(25)">x</p>',
      );
      await expect.poll(() => output(page)).toContain("gap: 7px");
      expect(await output(page)).toContain("opacity: 0.25");
      expect(await output(page)).toContain("@media (min-width: 1024px)");
      expect(await preview(page)).toContain("gap: 7px");

      // The preview really applies it, in a document that can't run scripts.
      const frame = page.frameLocator("section[aria-label=Preview] iframe");
      await expect
        .poll(() =>
          frame.locator("#p").evaluate((element) => getComputedStyle(element).backgroundColor),
        )
        .toBe("rgb(200, 253, 18)");
      expect(await page.locator("section[aria-label=Preview] iframe").getAttribute("sandbox")).toBe(
        "",
      );
      await page.close();
    });

    it("rejects scripts in the preview", async () => {
      const { page } = await open(browser, "/playground");
      await setValue(
        page,
        markup,
        `<img src=x onerror="document.title='pwned'"><script>document.title='pwned'</script>`,
      );
      await page.waitForTimeout(300);
      const frame = page.frameLocator("section[aria-label=Preview] iframe");
      expect(await frame.locator("img").count()).toBe(1);
      expect(await page.title()).not.toContain("pwned");
      await page.close();
    });

    it("recompiles when theme tokens change", async () => {
      const { page } = await open(browser, "/playground");
      await page.getByRole("button", { name: "Theme tokens" }).click();
      await setValue(page, 'input[aria-label="colors brand"]', "#ff0000");
      await expect.poll(() => preview(page)).toContain("--croff-color-brand: #ff0000");

      await setValue(page, 'input[aria-label="spacing 4"]', "banana");
      await expect
        .poll(() => page.locator("section[aria-label=Problems]").textContent())
        .toContain("should be a CSS length");
      await page.close();
    });

    it("explains mistakes", async () => {
      const { page } = await open(browser, "/playground");
      await page.getByRole("button", { name: "A few mistakes" }).click();
      const problems = page.locator("section[aria-label=Problems]");
      await expect.poll(() => problems.textContent()).toContain('Unknown utility "pad"');
      const text = await problems.textContent();
      for (const expected of [
        'Did you mean "padding"',
        'Unknown variant "hovr"',
        "Variant groups aren't supported.",
        "whitespace",
        "brackets",
      ]) {
        expect(text).toContain(expected);
      }
      await page.close();
    });

    it("restores a shared link", async () => {
      const { page } = await open(browser, "/playground");
      const shared = '<p class="gap(4)">shared é</p>';
      await setValue(page, markup, shared);
      await page.getByRole("button", { name: "Share" }).click();
      await page.waitForFunction(() => location.hash.length > 1);
      const url = page.url();
      const second = await browser.newPage();
      await second.goto(url);
      await hydrated(second);
      await expect.poll(() => second.locator(markup).inputValue()).toBe(shared);
      await second.close();
      await page.close();
    });
  });

  it("serves a real 404 page", async () => {
    const page = await browser.newPage();
    const response = await page.goto(`${BASE}/docs/nothing/here`);
    expect(response?.status()).toBe(404);
    await hydrated(page);
    expect(await page.locator("h1").textContent()).toContain("doesn't exist");
    await page.close();
  });

  describe("on a phone", () => {
    const phone = { width: 390, height: 844 };

    it.each([
      "/",
      "/docs/concepts/variants",
      "/docs/utilities/grid",
      "/docs/cli/reference",
      "/playground",
    ])("has no horizontal overflow on %s", async (route) => {
      const { page } = await open(browser, route, phone);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      await page.close();
    });

    it("swaps the sidebar for a menu", async () => {
      const { page } = await open(browser, "/docs/concepts/variants", phone);
      expect(await page.locator("aside").first().isVisible()).toBe(false);
      await page.getByRole("button", { name: /^Menu/ }).click();
      const menu = page.locator("main").getByRole("navigation", { name: "Documentation" });
      await menu.waitFor();
      await menu.getByRole("link", { name: "Parsing" }).click();
      await page.waitForURL("**/docs/concepts/parsing");
      expect(await menu.count()).toBe(0);
      await page.close();
    });

    it("hides the header's navigation but keeps search", async () => {
      const { page } = await open(browser, "/", phone);
      expect(await page.getByRole("navigation", { name: "Main" }).isVisible()).toBe(false);
      expect(await page.getByRole("button", { name: "Search the documentation" }).isVisible()).toBe(
        true,
      );
      await page.close();
    });
  });
});
