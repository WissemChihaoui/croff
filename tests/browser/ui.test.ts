import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as ui from "@croffcss/ui";
import { engineNames, launch, requireBuilt, type Browser, type Page } from "./helpers.js";

// Using the package the way a project without CROFF's tools would: only its stylesheet and its
// class names, on a page with no reset and no other styles.

describe.each(engineNames)("@croffcss/ui on a bare page in %s", (engine) => {
  let browser: Browser;
  let page: Page;
  const css = readFileSync(requireBuilt("packages/ui/dist/styles.css"), "utf8");

  const render = (body: string, extra = "", attributes = "") =>
    page.setContent(
      `<!doctype html><html ${attributes}><head><style>${css}${extra}</style></head><body class="${ui.page()}">${body}</body></html>`,
    );
  const style = (property: string, id = "x", pseudo?: string) =>
    page.evaluate(
      ([name, target, element]) =>
        getComputedStyle(document.getElementById(target!)!, element).getPropertyValue(name!),
      [property, id, pseudo] as const,
    );

  beforeAll(async () => {
    browser = await launch(engine);
  });
  beforeEach(async () => {
    page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  });
  afterEach(async () => {
    await page.close();
  });
  afterAll(async () => {
    await browser.close();
  });

  it("styles a button with no reset, cutting its corners", async () => {
    await render(`<button id="x" class="${ui.button()}">Save</button>`);
    expect(await style("background-color")).toBe("rgb(200, 253, 18)");
    expect(await style("color")).toBe("rgb(10, 10, 10)");
    expect(await style("border-top-style")).toBe("none");
    expect(await style("clip-path")).toContain("polygon");
  });

  it("changes on hover, and disables", async () => {
    await render(
      `<button id="x" class="${ui.button({ className: "duration(0)" })}">Save</button><button id="y" disabled class="${ui.button()}">No</button>`,
    );
    await page.hover("#x");
    await expect.poll(() => style("background-color")).toBe("rgb(245, 242, 241)");
    expect(await style("opacity", "y")).toBe("0.5");
    expect(await style("pointer-events", "y")).toBe("none");
  });

  it("puts the slash on a badge", async () => {
    await render(`<span id="x" class="${ui.badge({ tone: "success" })}">Passing</span>`);
    expect(await style("content", "x", "::before")).toBe('""');
    expect(await style("width", "x", "::before")).not.toBe("auto");
    expect(await style("transform", "x", "::before")).not.toBe("none");
  });

  it("puts the lime tab on a card", async () => {
    await render(`<div id="x" class="${ui.card()}">Card</div>`);
    expect(await style("background-color", "x", "::before")).toBe("rgb(200, 253, 18)");
    expect(await style("position", "x", "::before")).toBe("absolute");
  });

  it("removes native styling from controls, and shows them checked", async () => {
    await render(
      `<input id="x" type="checkbox" checked class="${ui.checkbox()}" />
       <input id="y" type="radio" class="${ui.radio()}" />
       <select id="z" class="${ui.select()}"><option>A</option></select>`,
    );
    expect(await style("appearance")).toBe("none");
    expect(await style("background-color")).toBe("rgb(200, 253, 18)");
    expect(await style("background-image")).toContain("linear-gradient");
    expect(await style("transform", "y")).not.toBe("none");
    expect(await style("background-image", "z")).toContain("linear-gradient");
  });

  it("marks a control invalid", async () => {
    await render(`<input id="x" aria-invalid="true" class="${ui.input()}" />`);
    expect(await style("border-top-color")).toBe("rgb(255, 107, 97)");
  });

  it("shows the selected tab", async () => {
    await render(`<button id="x" role="tab" aria-selected="true" class="${ui.tab()}">A</button>`);
    expect(await style("border-bottom-color")).toBe("rgb(200, 253, 18)");
  });

  it("flattens the accordion's slash when it opens", async () => {
    await render(
      `<details id="d"><summary>A<span id="x" class="${ui.accordionMarker()}"></span></summary></details>`,
    );
    const closed = await style("transform");
    await page.locator("summary").click();
    await expect.poll(() => style("transform")).not.toBe(closed);
  });

  it("dims the page behind a dialog", async () => {
    await render(`<dialog id="x" class="${ui.dialog()}">Hello</dialog>`);
    await page.evaluate(() => (document.getElementById("x") as HTMLDialogElement).showModal());
    expect(await style("background-color", "x", "::backdrop")).not.toBe("rgba(0, 0, 0, 0)");
  });

  it("switches theme for the whole page, or a part of it", async () => {
    await render(
      `<p id="x" class="${ui.cardBody()}">Dark</p><div data-theme="light"><p id="y" class="${ui.cardBody()}">Light</p></div>`,
    );
    expect(await style("color")).toBe("rgb(189, 187, 181)");
    expect(await style("color", "y")).toBe("rgb(69, 68, 61)");

    await render(`<p id="x" class="${ui.cardBody()}">All</p>`, "", 'data-theme="light"');
    expect(await style("color")).toBe("rgb(69, 68, 61)");
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
      "rgb(247, 246, 241)",
    );
  });

  it("restyles from a token override, with no rebuild", async () => {
    await render(
      `<button id="x" class="${ui.button()}">Save</button>`,
      ":root { --croff-color-brand: #ff5c00; }",
    );
    expect(await style("background-color")).toBe("rgb(255, 92, 0)");
  });

  it("keeps a spinner visible inside a primary button", async () => {
    await render(
      `<button class="${ui.button()}"><span id="x" class="${ui.spinner({ inherit: true })}"></span></button><span id="y" class="${ui.spinner()}"></span>`,
    );
    expect(await style("color")).toBe("rgb(10, 10, 10)");
    expect(await style("color", "y")).toBe("rgb(200, 253, 18)");
  });

  it("stops its motion for visitors who ask for less", async () => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await render(`<span id="x" class="${ui.spinner()}"></span>`);
    expect(await style("animation-name")).toBe("none");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    expect(await style("animation-name")).toBe("croff-ui-sweep");
  });
});
