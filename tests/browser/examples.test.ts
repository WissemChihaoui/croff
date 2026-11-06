import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  engineNames,
  launch,
  requireBuilt,
  resize,
  serveStatic,
  type Browser,
  type Page,
  type StaticServer,
} from "./helpers.js";

describe.each(engineNames)("examples in %s", (engine) => {
  let browser: Browser;
  let vanilla: StaticServer;
  let react: StaticServer;
  let showcase: StaticServer;

  beforeAll(async () => {
    browser = await launch(engine);
    requireBuilt("examples/vanilla/dist/croff.css");
    vanilla = await serveStatic(requireBuilt("examples/vanilla"));
    react = await serveStatic(requireBuilt("examples/vite-react/dist"));
    showcase = await serveStatic(requireBuilt("examples/showcase/dist"));
  });

  afterAll(async () => {
    await Promise.all([vanilla.close(), react.close(), showcase.close()]);
    await browser.close();
  });

  const open = async (url: string, viewport = { width: 1280, height: 800 }) => {
    const page = await browser.newPage({ viewport });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(url, { waitUntil: "networkidle" });
    return { page, errors };
  };

  const style = (page: Page, selector: string, property: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property);

  it("vanilla HTML is styled by the CLI's output", async () => {
    const { page, errors } = await open(vanilla.url);
    expect(await style(page, "body", "background-color")).toBe("rgb(10, 10, 10)");
    expect(await style(page, "h1", "font-size")).toBe("36px");
    expect(await style(page, "button", "background-color")).toBe("rgb(200, 253, 18)");
    expect((await style(page, "main > div", "grid-template-columns")).split(" ")).toHaveLength(3);

    await page.hover("button");
    await expect.poll(() => style(page, "button", "background-color")).toBe("rgb(164, 211, 11)");

    await resize(page, 500);
    expect((await style(page, "main > div", "grid-template-columns")).split(" ")).toHaveLength(1);
    expect(errors).toEqual([]);
    await page.close();
  });

  it("React and Vite works, with a custom token", async () => {
    const { page, errors } = await open(react.url);
    await page.getByRole("button", { name: "Increment" }).click();
    await page.getByRole("button", { name: "Increment" }).click();
    expect(await page.getByTestId("count").textContent()).toBe("2");
    await page.getByRole("button", { name: "Reset" }).click();
    expect(await page.getByTestId("count").textContent()).toBe("0");

    // bg(surface) is defined in the example's own croff.config.ts.
    const card = page.getByTestId("count").locator("..");
    expect(await card.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
      "rgb(20, 20, 20)",
    );
    expect(await style(page, "h1", "font-size")).toBe("48px");
    expect(errors).toEqual([]);
    await page.close();
  });

  it("showcase works through PostCSS, with its plugin", async () => {
    const { page, errors } = await open(showcase.url);
    for (const title of ["Buttons", "Cards", "Navigation", "Forms", "Layouts", "Typography"]) {
      await expect.poll(() => page.getByRole("heading", { name: title }).count()).toBe(1);
    }

    // A disabled button, through disabled:opacity(50).
    expect(await style(page, "button:disabled", "opacity")).toBe("0.5");

    // The plugin's utility and variant.
    expect(await style(page, "article p", "-webkit-line-clamp")).toBe("3");
    const grid = page.locator("section", { hasText: "Layouts" }).locator(".group, div").last();
    await grid.waitFor();
    const first = page.getByText("1", { exact: true });
    expect(await first.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
      "rgb(200, 253, 18)",
    );

    // group-hover: hovering the card recolors its heading.
    const article = page.locator("article").first();
    await page.mouse.move(0, 0);
    await article.hover();
    await expect
      .poll(() => article.locator("h3").evaluate((element) => getComputedStyle(element).color))
      .toBe("rgb(200, 253, 18)");

    // focus-within on a form label.
    await page.locator("input[type=email]").focus();
    expect(
      await page
        .locator("label", { hasText: "Email" })
        .evaluate((element) => getComputedStyle(element).color),
    ).toBe("rgb(200, 253, 18)");

    // The navigation changes at the sm breakpoint.
    const links = page.locator("nav ul");
    expect(await links.evaluate((element) => getComputedStyle(element).display)).toBe("flex");
    await resize(page, 500);
    expect(await links.evaluate((element) => getComputedStyle(element).display)).toBe("none");

    expect(errors).toEqual([]);
    await page.close();
  });
});
