import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { builtinUtilities, createCroff } from "@croff/core";
import { engineNames, launch, resize, type Browser, type Page } from "./helpers.js";

// Checks what no text comparison can: that real browser engines accept the
// generated CSS, that the escaped selectors match the class names people write,
// and that the cascade comes out the way the documentation says.

const VIEWPORT = { width: 1600, height: 900 };

async function render(page: Page, css: string, body: string) {
  await page.setContent(
    `<!doctype html><html><head><style>${css}</style></head><body>${body}</body></html>`,
  );
}

const element = (expression: string, id = "x") =>
  `<div id="${id}" class="${expression.replaceAll('"', "&quot;")}">x</div>`;

describe.each(engineNames)("generated CSS in %s", (engine) => {
  let browser: Browser;
  let page: Page;
  const croff = createCroff();

  beforeAll(async () => {
    browser = await launch(engine);
  });
  beforeEach(async () => {
    page = await browser.newPage({ viewport: VIEWPORT });
  });
  afterEach(async () => {
    await page.close();
  });
  afterAll(async () => {
    await browser.close();
  });

  const computed = (property: string, id = "x") =>
    page.evaluate(
      ([name, target]) =>
        getComputedStyle(document.getElementById(target!)!).getPropertyValue(name!),
      [property, id],
    );

  it("accepts every declaration of every documented example, and matches its class name", async () => {
    const examples = builtinUtilities.flatMap((utility) => utility.examples);
    const { css, rules, failures } = croff.compile(examples);
    expect(failures).toEqual([]);
    await render(page, css, "");

    const problems = await page.evaluate(
      (compiled) => {
        const STATE = /(?<!\\):(hover|focus-visible|focus-within|focus|active|disabled)$/;
        const found: CSSStyleRule[] = [];
        const walk = (list: CSSRuleList) => {
          for (const rule of Array.from(list)) {
            if (rule instanceof CSSStyleRule) found.push(rule);
            else if ("cssRules" in rule) walk((rule as CSSMediaRule).cssRules);
          }
        };
        walk(document.styleSheets[0]!.cssRules);

        const issues: string[] = [];
        for (const { expression, declarations } of compiled) {
          const probe = document.createElement("div");
          probe.className = expression;
          const owner = document.createElement("div");
          owner.className = "group";
          owner.append(probe);
          const rule = found.find((candidate) => {
            if (candidate.selectorText === ":root") return false;
            // States can't be forced here, so compare the selector without them.
            const plain = candidate.selectorText
              .replace(STATE, "")
              .replace(/^\.group:hover\s+/, "");
            try {
              return probe.matches(plain);
            } catch {
              return false;
            }
          });
          if (!rule) {
            issues.push(`${expression}: no rule's selector matches this class name`);
            continue;
          }
          // Not every shorthand serializes back, so ask the engine about the declaration itself.
          if (rule.style.length === 0) issues.push(`${expression}: the browser kept nothing`);
          for (const [property, value] of declarations) {
            if (!CSS.supports(property, value)) {
              issues.push(`${expression}: the browser rejects "${property}: ${value}"`);
            }
          }
        }
        return issues;
      },
      rules.map(({ expression, declarations }) => ({ expression, declarations })),
    );

    expect(problems).toEqual([]);
    expect(rules.length).toBeGreaterThan(200);
  });

  // Production output is minified, so this is what users actually get.
  it.each<[string, string, string]>([
    ["flex(col)", "flex-direction", "column"],
    ["flex(col)", "display", "flex"],
    ["gap(4)", "row-gap", "16px"],
    ["padding(4,8)", "padding-left", "32px"],
    ["margin-x(2)", "margin-right", "8px"],
    ["margin-top(-4)", "margin-top", "-16px"],
    ["width(64)", "width", "256px"],
    ["width[320px]", "width", "320px"],
    ["height[calc(100px-20px)]", "height", "80px"],
    ["width[calc(100px+var(--missing,20px))]", "width", "120px"],
    ["margin-left[calc((10px+2px)*2)]", "margin-left", "24px"],
    ["bg(brand)", "background-color", "rgb(200, 253, 18)"],
    ["bg[#121212]", "background-color", "rgb(18, 18, 18)"],
    ["bg-color[rgb(1,2,3)]", "background-color", "rgb(1, 2, 3)"],
    ["text-color(brand)", "color", "rgb(200, 253, 18)"],
    ["text-size(lg)", "font-size", "18px"],
    ["text-size[clamp(10px,12px,14px)]", "font-size", "12px"],
    ["text-weight(bold)", "font-weight", "700"],
    ["opacity(50)", "opacity", "0.5"],
    ["radius(md)", "border-top-left-radius", "8px"],
    ["border(2,brand)", "border-top-width", "2px"],
    ["border(2,brand)", "border-top-color", "rgb(200, 253, 18)"],
    ["position(sticky)", "position", "sticky"],
    ["z-index(-1)", "z-index", "-1"],
    ["text-transform(uppercase)", "text-transform", "uppercase"],
    ["whitespace(pre-wrap)", "white-space-collapse", "preserve"],
    ["grid-span(full)", "grid-column-end", "-1"],
    ["aspect-ratio(16/9)", "aspect-ratio", "16 / 9"],
    ["font['Georgia',serif]", "font-family", "Georgia, serif"],
    ["2xl:width[111px]", "width", "111px"],
  ])("applies %s: %s", async (expression, property, expected) => {
    await render(page, croff.compile([expression], { minify: true }).css, element(expression));
    const value = await computed(property);
    // Only some engines expose white-space-collapse as a longhand.
    if (property === "white-space-collapse" && value === "") {
      expect(await computed("white-space")).toBe("pre-wrap");
    } else {
      // Engines differ on whether computed font names keep their quotes.
      expect(property === "font-family" ? value.replaceAll('"', "") : value).toBe(expected);
    }
  });

  it("escapes every unusual character so that selectors match", async () => {
    const expressions = [
      "width(1/2)",
      "width[50%]",
      "bg[#c8fd12]",
      "margin[0_auto]",
      "font['a_b',serif]",
      "bg-image[url(/a_b.png)]",
      "2xl:gap(4)",
      "columns[[a]_1fr_[b]]",
      "width[calc(100%-var(--a-b))]",
      "bg(alpha(brand,50))",
      "hover:transform(translate-y(-2px),scale(1.02))",
    ];
    const { css, failures } = croff.compile(expressions);
    expect(failures).toEqual([]);
    await render(page, css, "");
    const unmatched = await page.evaluate((list) => {
      const rules = (sheet: CSSRuleList): string[] =>
        Array.from(sheet).flatMap((rule) =>
          rule instanceof CSSStyleRule
            ? [rule.selectorText]
            : "cssRules" in rule
              ? rules((rule as CSSMediaRule).cssRules)
              : [],
        );
      const selectors = rules(document.styleSheets[0]!.cssRules).map((selector) =>
        selector.replace(/(?<!\\):hover$/, ""),
      );
      return list.filter((expression) => {
        const probe = document.createElement("div");
        probe.className = expression;
        return !selectors.some((selector) => selector !== ":root" && probe.matches(selector));
      });
    }, expressions);
    expect(unmatched).toEqual([]);
  });

  it("resolves nested functions", async () => {
    const expression = "bg(alpha(brand,50))";
    await render(page, croff.compile([expression]).css, element(expression));
    const value = await computed("background-color");
    expect(value).not.toBe("rgba(0, 0, 0, 0)");
    expect(value).not.toBe("rgb(200, 253, 18)");

    const transformed = "transform(rotate(90deg))";
    await render(page, croff.compile([transformed]).css, element(transformed));
    expect(await computed("transform")).toMatch(/^matrix\(/);
  });

  it("applies each breakpoint from its width up", async () => {
    const expressions = [
      "width[1px]",
      "sm:width[2px]",
      "md:width[3px]",
      "lg:width[4px]",
      "xl:width[5px]",
      "2xl:width[6px]",
    ];
    await render(
      page,
      croff.compile(expressions, { minify: true }).css,
      element(expressions.join(" ")),
    );
    for (const [width, expected] of [
      [639, "1px"],
      [640, "2px"],
      [767, "2px"],
      [768, "3px"],
      [1024, "4px"],
      [1280, "5px"],
      [1536, "6px"],
    ] as const) {
      await resize(page, width);
      expect(await computed("width"), `at ${width}px`).toBe(expected);
    }
  });

  it("applies state variants", async () => {
    const expressions = [
      "bg[rgb(1,1,1)]",
      "hover:bg[rgb(2,2,2)]",
      "active:bg[rgb(3,3,3)]",
      "text-color[rgb(1,1,1)]",
      "group-hover:text-color[rgb(2,2,2)]",
      "disabled:opacity(50)",
      "focus-within:bg[rgb(4,4,4)]",
      "focus:bg[rgb(5,5,5)]",
    ];
    const { css } = croff.compile(expressions);
    await render(
      page,
      css,
      `<div class="group" id="group" style="padding:50px">group
         <span id="child" class="text-color[rgb(1,1,1)] group-hover:text-color[rgb(2,2,2)]">child</span>
       </div>
       <button id="button" style="width:200px;height:50px" class="bg[rgb(1,1,1)] hover:bg[rgb(2,2,2)] active:bg[rgb(3,3,3)]">b</button>
       <button id="off" disabled class="disabled:opacity(50)">off</button>
       <div id="within" class="focus-within:bg[rgb(4,4,4)]"><input id="inner" /></div>
       <input id="focusable" class="focus:bg[rgb(5,5,5)]" />`,
    );
    const background = (id: string) => computed("background-color", id);

    await page.mouse.move(0, 0);
    expect(await background("button")).toBe("rgb(1, 1, 1)");
    await page.hover("#button");
    expect(await background("button")).toBe("rgb(2, 2, 2)");
    await page.mouse.down();
    expect(await background("button")).toBe("rgb(3, 3, 3)");
    await page.mouse.up();
    await page.mouse.move(0, 0);

    expect(await computed("color", "child")).toBe("rgb(1, 1, 1)");
    await page.hover("#group");
    expect(await computed("color", "child")).toBe("rgb(2, 2, 2)");
    await page.mouse.move(0, 0);

    expect(await computed("opacity", "off")).toBe("0.5");

    await page.focus("#inner");
    expect(await background("within")).toBe("rgb(4, 4, 4)");
    await page.focus("#focusable");
    expect(await background("focusable")).toBe("rgb(5, 5, 5)");
  });

  it("applies focus-visible on keyboard focus", async () => {
    const expression = "focus-visible:bg[rgb(9,9,9)]";
    await render(page, croff.compile([expression]).css, `<input id="x" class="${expression}" />`);
    await page.keyboard.press("Tab");
    expect(await computed("background-color")).toBe("rgb(9, 9, 9)");
  });

  it("gives the documented cascade, whatever order classes are written in", async () => {
    const expressions = [
      "padding-top[8px]",
      "padding-x[6px]",
      "padding[1px]",
      "md:padding[2px]",
      "hover:padding[3px]",
    ];
    const { css } = croff.compile([...expressions].reverse());
    await render(page, css, element("padding-top[8px] padding-x[6px] padding[1px]"));
    expect(await computed("padding-top")).toBe("8px");
    expect(await computed("padding-left")).toBe("6px");
    expect(await computed("padding-bottom")).toBe("1px");

    await render(page, css, element("padding[1px] md:padding[2px] hover:padding[3px]"));
    await page.mouse.move(0, 0);
    expect(await computed("padding-bottom")).toBe("2px");
  });

  it("keeps later rules working when given hostile values", async () => {
    const hostile = [
      "width[1px/*]",
      "width[a\\(]",
      "width[a\\)]",
      "width[1px\\\\]",
      "width[1px;color:red]",
      "width[1px}body{display:none]",
      "width[</style><script>x</script>]",
      "font['unterminated]",
    ];
    const { css, failures } = croff.compile([...hostile, "opacity(50)"]);
    expect(failures).toHaveLength(hostile.length);
    await render(page, css, element("opacity(50)"));
    expect(await computed("opacity")).toBe("0.5");
    expect(await computed("display")).toBe("block");
  });

  it("keeps later rules working after allowed but tricky values", async () => {
    const tricky = [
      "bg-image[url(data:image/png;base64,iVBORw0KGgo=)]",
      "font['a;b}c{',serif]",
      "width[calc(1px+2px)]",
      "text-size[clamp(1px,2px,3px)]",
    ];
    const { css, failures } = createCroff().compile([...tricky, "opacity(50)"]);
    expect(failures).toEqual([]);
    await render(page, css, element("opacity(50)"));
    expect(await computed("opacity")).toBe("0.5");
  });

  it("applies the reset", async () => {
    await render(page, croff.compile([], { layers: ["reset"] }).css, element(""));
    expect(await computed("box-sizing")).toBe("border-box");
    expect(await computed("margin-top")).toBe("0px");
  });
});

describe.each(engineNames)("variant groups in %s", (engine) => {
  let browser: Browser;
  let page: Page;
  const croff = createCroff();

  beforeAll(async () => {
    browser = await launch(engine);
  });
  beforeEach(async () => {
    page = await browser.newPage({ viewport: VIEWPORT });
  });
  afterEach(async () => {
    await page.close();
  });
  afterAll(async () => {
    await browser.close();
  });

  const styleOf = (id: string, properties: string[]) =>
    page.evaluate(
      ([target, names]) => {
        const style = getComputedStyle(document.getElementById(target as string)!);
        return (names as string[]).map((name) => style.getPropertyValue(name));
      },
      [id, properties] as const,
    );

  // The same element twice: with a group, and with the expressions written out.
  async function renderBoth(group: string, expanded: string[]) {
    const { css, failures } = croff.compile([group, ...expanded], { minify: true });
    expect(failures).toEqual([]);
    await render(
      page,
      css,
      `<button id="grouped" class="${group}">a</button>
       <button id="written" class="${expanded.join(" ")}">b</button>
       <div class="group" id="owner" style="padding:20px">
         <span id="grouped-child" class="${group}">c</span>
         <span id="written-child" class="${expanded.join(" ")}">d</span>
       </div>`,
    );
  }

  const PROPERTIES = [
    "background-color",
    "padding-top",
    "row-gap",
    "border-top-left-radius",
    "color",
    "opacity",
  ];

  it("behaves exactly like the written-out form when idle and at a breakpoint", async () => {
    await renderBoth("md:(padding(4),gap(4),radius(lg))", [
      "md:padding(4)",
      "md:gap(4)",
      "md:radius(lg)",
    ]);
    for (const width of [500, 1000]) {
      await resize(page, width);
      expect(await styleOf("grouped", PROPERTIES)).toEqual(await styleOf("written", PROPERTIES));
    }
    expect((await styleOf("grouped", ["padding-top"]))[0]).toBe("16px");
    await resize(page, 500);
    expect((await styleOf("grouped", ["padding-top"]))[0]).not.toBe("16px");
  });

  it("applies state variants", async () => {
    await renderBoth("hover:(bg(brand),padding(4))", ["hover:bg(brand)", "hover:padding(4)"]);
    await page.mouse.move(0, 0);
    const idle = await styleOf("grouped", PROPERTIES);
    expect(idle[0]).not.toBe("rgb(200, 253, 18)");
    await page.hover("#grouped");
    const hovered = await styleOf("grouped", PROPERTIES);
    expect(hovered[0]).toBe("rgb(200, 253, 18)");
    expect(hovered[1]).toBe("16px");
    await page.hover("#written");
    expect(await styleOf("written", PROPERTIES)).toEqual(hovered);
  });

  it("applies combined and nested variants", async () => {
    const group = "md:(padding(4),hover:(bg(brand),opacity(50)))";
    await renderBoth(group, ["md:padding(4)", "md:hover:bg(brand)", "md:hover:opacity(50)"]);
    await page.mouse.move(0, 0);
    await page.hover("#grouped");
    expect(await styleOf("grouped", ["background-color", "opacity", "padding-top"])).toEqual([
      "rgb(200, 253, 18)",
      "0.5",
      "16px",
    ]);

    await resize(page, 500);
    await page.hover("#grouped");
    expect((await styleOf("grouped", ["background-color"]))[0]).not.toBe("rgb(200, 253, 18)");
  });

  it("applies group-hover", async () => {
    const group = "group-hover:(opacity(50),text-color(brand))";
    await renderBoth(group, ["group-hover:opacity(50)", "group-hover:text-color(brand)"]);
    await page.mouse.move(0, 0);
    await page.hover("#owner");
    expect(await styleOf("grouped-child", ["opacity", "color"])).toEqual([
      "0.5",
      "rgb(200, 253, 18)",
    ]);
    expect(await styleOf("written-child", ["opacity", "color"])).toEqual([
      "0.5",
      "rgb(200, 253, 18)",
    ]);
  });

  it("supports arbitrary values and nested functions", async () => {
    const group = "2xl:(width[calc(100px+20px)],transform(rotate(90deg)),bg(alpha(brand,50)))";
    await render(
      page,
      croff.compile([group], { minify: true }).css,
      `<div id="x" class="${group}">x</div>`,
    );
    const [width, transform, background] = await styleOf("x", [
      "width",
      "transform",
      "background-color",
    ]);
    expect(width).toBe("120px");
    expect(transform).toMatch(/^matrix\(/);
    expect(background).not.toBe("rgba(0, 0, 0, 0)");
  });

  it("gives the same cascade as the written-out form", async () => {
    // padding-top must beat padding, whichever is first in the group.
    const group = "hover:(padding-top(8),padding(1))";
    await render(page, croff.compile([group]).css, `<button id="x" class="${group}">x</button>`);
    await page.hover("#x");
    expect(await styleOf("x", ["padding-top", "padding-left"])).toEqual(["32px", "4px"]);
  });

  it("shares a rule with the written-out form without conflict", async () => {
    const group = "hover:(gap(4),opacity(50))";
    const { css } = croff.compile(["hover:gap(4)", group], { minify: true });
    await render(
      page,
      css,
      `<div id="a" class="hover:gap(4)">a</div><div id="b" class="${group}">b</div>`,
    );
    await page.hover("#b");
    expect((await styleOf("b", ["row-gap"]))[0]).toBe("16px");
    await page.hover("#a");
    expect((await styleOf("a", ["row-gap"]))[0]).toBe("16px");
    expect((await styleOf("a", ["opacity"]))[0]).toBe("1");
  });
});

describe.each(engineNames)("color and scale in %s", (engine) => {
  let browser: Browser;
  let page: Page;
  const croff = createCroff();
  const SCALED = "matrix(1.05, 0, 0, 1.05, 0, 0)";

  beforeAll(async () => {
    browser = await launch(engine);
  });
  beforeEach(async () => {
    page = await browser.newPage({ viewport: VIEWPORT });
  });
  afterEach(async () => {
    await page.close();
  });
  afterAll(async () => {
    await browser.close();
  });

  const style = (id: string, property: string) =>
    page.evaluate(
      ([target, name]) =>
        getComputedStyle(document.getElementById(target!)!).getPropertyValue(name!),
      [id, property],
    );

  it("set the color and transform", async () => {
    const expressions = [
      "color(brand)",
      "scale(105)",
      "color[#010203]",
      "scale[1.05,1.05]",
      "scale(var(--z))",
    ];
    await render(
      page,
      croff.compile(expressions, { minify: true }).css,
      `<div id="a" class="color(brand)">a</div>
       <div id="b" class="scale(105)">b</div>
       <div id="c" class="color[#010203]">c</div>
       <div id="d" class="scale[1.05,1.05]">d</div>
       <div id="e" style="--z:1.05" class="scale(var(--z))">e</div>`,
    );
    expect(await style("a", "color")).toBe("rgb(200, 253, 18)");
    expect(await style("b", "transform")).toBe(SCALED);
    expect(await style("c", "color")).toBe("rgb(1, 2, 3)");
    expect(await style("d", "transform")).toBe(SCALED);
    expect(await style("e", "transform")).toBe(SCALED);
  });

  it("match their longer forms", async () => {
    await render(
      page,
      croff.compile(["color(brand)", "text-color(brand)", "scale(105)", "transform(scale(1.05))"])
        .css,
      `<div id="a" class="color(brand)">a</div><div id="b" class="text-color(brand)">b</div>
       <div id="c" class="scale(105)">c</div><div id="d" class="transform(scale(1.05))">d</div>`,
    );
    expect(await style("a", "color")).toBe(await style("b", "color"));
    expect(await style("c", "transform")).toBe(await style("d", "transform"));
  });

  it("win when both forms are on an element", async () => {
    const classes = "text-color[rgb(1,1,1)] color[rgb(2,2,2)] transform(rotate(5deg)) scale(105)";
    await render(
      page,
      croff.compile(classes.split(" ")).css,
      `<div id="x" class="${classes}">x</div>`,
    );
    expect(await style("x", "color")).toBe("rgb(2, 2, 2)");
    expect(await style("x", "transform")).toBe(SCALED);
  });

  it("work with responsive and state variants, and in nested groups", async () => {
    const group = "md:(color(brand),hover:(scale(105),color(white)))";
    await render(
      page,
      croff.compile([group], { minify: true }).css,
      `<button id="x" style="width:200px;height:60px" class="${group}">x</button>`,
    );
    await page.mouse.move(0, 0);
    expect(await style("x", "color")).toBe("rgb(200, 253, 18)");
    expect(await style("x", "transform")).toBe("none");

    await page.hover("#x");
    expect(await style("x", "transform")).toBe(SCALED);
    expect(await style("x", "color")).toBe("rgb(255, 255, 255)");

    await page.mouse.move(0, 0);
    await resize(page, 500);
    await page.hover("#x");
    expect(await style("x", "transform")).toBe("none");
    expect(await style("x", "color")).not.toBe("rgb(200, 253, 18)");
  });
});
