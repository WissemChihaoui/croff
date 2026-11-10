import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { builtinUtilities, createCroff } from "@croffcss/core";
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

  describe("everyday variants", () => {
    const show = (classes: string, tag = "div") =>
      render(
        page,
        croff.compile(classes.split(" "), { minify: true }).css,
        `<${tag} id="x" class="${classes.replaceAll('"', "&quot;")}">x</${tag}><p id="y">y</p>`,
      );
    const pseudo = (name: string, property: string) =>
      page.evaluate(
        ([target, prop]) =>
          getComputedStyle(document.getElementById("x")!, target!).getPropertyValue(prop!),
        [name, property],
      );

    it("dark: follows the color scheme", async () => {
      await show("color[rgb(1,1,1)] dark:color[rgb(2,2,2)]");
      await page.emulateMedia({ colorScheme: "light" });
      expect(await computed("color")).toBe("rgb(1, 1, 1)");
      await page.emulateMedia({ colorScheme: "dark" });
      expect(await computed("color")).toBe("rgb(2, 2, 2)");
    });

    it("motion-reduce: follows the preference", async () => {
      await show("opacity(50) motion-reduce:opacity(25)");
      await page.emulateMedia({ reducedMotion: "no-preference" });
      expect(await computed("opacity")).toBe("0.5");
      await page.emulateMedia({ reducedMotion: "reduce" });
      expect(await computed("opacity")).toBe("0.25");
    });

    it("print: applies only when printing", async () => {
      await show("display(block) print:display(none)");
      await page.emulateMedia({ media: "screen" });
      expect(await computed("display")).toBe("block");
      await page.emulateMedia({ media: "print" });
      expect(await computed("display")).toBe("none");
    });

    it("first: and last: match by position", async () => {
      const classes = "first:gap[1px] last:gap[2px]";
      await render(
        page,
        croff.compile(classes.split(" "), { minify: true }).css,
        `<ul><li id="a" class="${classes}"></li><li id="b" class="${classes}"></li><li id="c" class="${classes}"></li></ul>`,
      );
      expect(await computed("row-gap", "a")).toBe("1px");
      expect(await computed("row-gap", "b")).toBe("normal");
      expect(await computed("row-gap", "c")).toBe("2px");
    });

    it("before: renders without anyone writing content", async () => {
      await show("before:display(block) before:width[10px] before:height[10px]");
      expect(await pseudo("::before", "content")).toBe('""');
      expect(await pseudo("::before", "width")).toBe("10px");
      expect(await pseudo("::after", "content")).toBe("none");
    });

    it("after: shows text from content, with a space from an underscore", async () => {
      await show("after:content['Hi_there']");
      expect(await pseudo("::after", "content")).toBe('"Hi there"');
    });

    it("content: replaces the default whichever rule comes first", async () => {
      await show("before:content['x'] before:color[rgb(1,2,3)] before:[width:9px]");
      expect(await pseudo("::before", "content")).toBe('"x"');
      expect(await pseudo("::before", "color")).toBe("rgb(1, 2, 3)");
    });

    it("before:hover: is a selector the browser accepts", async () => {
      await show("before:hover:color[rgb(1,2,3)] before:content['x']");
      await page.hover("#x");
      expect(await pseudo("::before", "color")).toBe("rgb(1, 2, 3)");
    });
  });

  describe("right-to-left text", () => {
    const classes =
      "padding-start[11px] border-start[3px_solid_red] rtl:color[rgb(1,1,1)] ltr:color[rgb(2,2,2)]";
    const css = () => croff.compile(classes.split(" "), { minify: true }).css;

    it("puts logical utilities on the left in English and on the right in Arabic", async () => {
      await render(page, css(), `<div id="x" class="${classes}">x</div>`);
      expect(await computed("padding-left")).toBe("11px");
      expect(await computed("border-left-width")).toBe("3px");
      expect(await computed("padding-right")).toBe("0px");
      await page.evaluate(() => document.documentElement.setAttribute("dir", "rtl"));
      expect(await computed("padding-right")).toBe("11px");
      expect(await computed("border-right-width")).toBe("3px");
      expect(await computed("padding-left")).toBe("0px");
    });

    it("rtl: and ltr: follow dir on <html> and on any ancestor", async () => {
      await render(
        page,
        css(),
        `<div id="x" class="${classes}">x</div><section dir="rtl"><p id="y" class="${classes}">y</p></section>`,
      );
      expect(await computed("color")).toBe("rgb(2, 2, 2)");
      expect(await computed("color", "y")).toBe("rgb(1, 1, 1)");
      await page.evaluate(() => document.documentElement.setAttribute("dir", "rtl"));
      expect(await computed("color")).toBe("rgb(1, 1, 1)");
    });
  });

  describe("theme values", () => {
    it("apply a clamp() token written without spaces", async () => {
      const themed = createCroff({ theme: { textSizes: { hero: "clamp(10px,5px+1vw,40px)" } } });
      await render(page, themed.compile(["text-size(hero)"]).css, element("text-size(hero)"));
      // 5px + 1% of the 1600px viewport.
      expect(await computed("font-size")).toBe("21px");
    });

    it("apply a radius token with a value per corner", async () => {
      const themed = createCroff({ theme: { radius: { tab: "10px 10px 0 0" } } });
      await render(page, themed.compile(["radius(tab)"]).css, element("radius(tab)"));
      expect(await computed("border-top-left-radius")).toBe("10px");
      expect(await computed("border-bottom-right-radius")).toBe("0px");
    });
  });

  describe("arbitrary properties", () => {
    it("set any property, and match the class name written", async () => {
      await render(page, croff.compile(["[float:left]"]).css, element("[float:left]"));
      expect(await computed("float")).toBe("left");
    });

    it("take variants", async () => {
      const classes = ["[tab-size:3]", "hover:[tab-size:5]"];
      await render(page, croff.compile(classes).css, element(classes.join(" ")));
      await page.mouse.move(0, 0);
      expect(await computed("tab-size")).toBe("3");
      await page.hover("#x");
      expect(await computed("tab-size")).toBe("5");
    });

    it("set custom properties that others can read", async () => {
      const classes = ["[--box:7px]", "width[var(--box)]"];
      await render(page, croff.compile(classes).css, element(classes.join(" ")));
      expect(await computed("width")).toBe("7px");
    });
  });

  it("truncate() really cuts off long text", async () => {
    await render(
      page,
      croff.compile(["truncate()", "width[40px]"]).css,
      `<div id="x" class="truncate() width[40px]">a very long line of text indeed</div>`,
    );
    expect(await computed("text-overflow")).toBe("ellipsis");
    expect(
      await page.evaluate(() => {
        const box = document.getElementById("x")!;
        return box.scrollWidth > box.clientWidth;
      }),
    ).toBe(true);
  });

  it("filter() applies its functions", async () => {
    await render(
      page,
      croff.compile(["filter(blur(2px),grayscale(100%))"]).css,
      element("filter(blur(2px),grayscale(100%))"),
    );
    expect(await computed("filter")).toBe("blur(2px) grayscale(1)");
  });

  it("accepts every declaration of every documented example, and matches its class name", async () => {
    const examples = builtinUtilities.flatMap((utility) => utility.examples);
    const { css, rules, failures } = croff.compile(examples);
    expect(failures).toEqual([]);
    await render(page, css, "");

    const problems = await page.evaluate(
      (compiled) => {
        const STATE =
          /(?<!\\):(hover|focus-visible|focus-within|focus|active|disabled|first-child|last-child|:before|:after)$/;
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

describe.each(engineNames)("cascade conflicts in %s", (engine) => {
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

  const paddingOf = (id = "x") =>
    page.evaluate((target) => getComputedStyle(document.getElementById(target)!).paddingTop, id);

  async function setup(classes: string[], wrapper = false) {
    const element = `<button id="x" style="width:200px;height:60px" class="${classes.join(" ")}">x</button>`;
    await render(
      page,
      croff.compile(classes, { minify: true }).css,
      wrapper ? `<div class="group" id="owner" style="padding:30px">${element}</div>` : element,
    );
    await page.mouse.move(0, 0);
  }

  it("md: beats an unprefixed utility, because it comes later", async () => {
    await setup(["padding[1px]", "md:padding[2px]"]);
    expect(await paddingOf()).toBe("2px");
    await resize(page, 500);
    expect(await paddingOf()).toBe("1px");
  });

  it("hover: beats md:, because a pseudo-class adds specificity", async () => {
    await setup(["hover:padding[3px]", "md:padding[2px]"]);
    expect(await paddingOf()).toBe("2px");
    await page.hover("#x");
    expect(await paddingOf()).toBe("3px");
  });

  it("md:hover: beats hover: at the breakpoint, and not below it", async () => {
    await setup(["hover:padding[3px]", "md:hover:padding[4px]"]);
    await page.hover("#x");
    expect(await paddingOf()).toBe("4px");
    await resize(page, 500);
    await page.hover("#x");
    expect(await paddingOf()).toBe("3px");
  });

  it("group-hover: beats hover:, despite coming earlier in the output", async () => {
    await setup(["hover:padding[3px]", "group-hover:padding[5px]"], true);
    await page.hover("#x");
    expect(await paddingOf()).toBe("5px");
  });

  it("group-hover: beats md:", async () => {
    await setup(["md:padding[2px]", "group-hover:padding[5px]"], true);
    expect(await paddingOf()).toBe("2px");
    await page.hover("#owner");
    expect(await paddingOf()).toBe("5px");
  });

  it("states of equal specificity follow output order", async () => {
    await setup(["hover:padding[3px]", "active:padding[6px]"]);
    await page.hover("#x");
    expect(await paddingOf()).toBe("3px");
    await page.mouse.down();
    expect(await paddingOf()).toBe("6px");
    await page.mouse.up();
  });

  it("stacked states beat a single state, even one later in the output", async () => {
    const classes = ["focus-visible:padding[6px]", "hover:focus:padding[7px]"];
    const { css, rules } = croff.compile(classes, { minify: true });
    // Output order alone would give focus-visible the win, so only specificity can explain 7px.
    expect(rules.map((rule) => rule.expression)).toEqual([
      "hover:focus:padding[7px]",
      "focus-visible:padding[6px]",
    ]);
    await render(page, css, `<input id="x" class="${classes.join(" ")}" />`);
    await page.focus("#x");
    expect(await paddingOf()).toBe("6px");
    await page.hover("#x");
    expect(await paddingOf()).toBe("7px");
  });

  it("gives the same result whatever order classes are written in", async () => {
    await setup(
      ["md:padding[2px]", "group-hover:padding[5px]", "hover:padding[3px]", "padding[1px]"],
      true,
    );
    await page.hover("#x");
    const first = await paddingOf();
    await setup(
      ["padding[1px]", "hover:padding[3px]", "group-hover:padding[5px]", "md:padding[2px]"],
      true,
    );
    await page.hover("#x");
    expect(await paddingOf()).toBe(first);
    expect(first).toBe("5px");
  });
});

describe.each(engineNames)("unsupported grouping syntax in %s", (engine) => {
  it("generates no rule for it, and leaves other classes working", async () => {
    const browser = await launch(engine);
    const page = await browser.newPage({ viewport: VIEWPORT });
    const group = "hover:(padding[9px],opacity(50))";
    const { css, failures } = createCroff().compile([group, "padding[1px]"], { minify: true });
    expect(failures).toHaveLength(1);
    await render(page, css, `<button id="x" class="${group} padding[1px]">x</button>`);
    await page.hover("#x");
    const paddingTop = await page.evaluate(
      () => getComputedStyle(document.getElementById("x")!).paddingTop,
    );
    expect(paddingTop).toBe("1px");
    await browser.close();
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

  it("work with responsive and state variants, combined", async () => {
    const classes = ["md:color(brand)", "md:hover:scale(105)", "md:hover:color(white)"];
    await render(
      page,
      croff.compile(classes, { minify: true }).css,
      `<button id="x" style="width:200px;height:60px" class="${classes.join(" ")}">x</button>`,
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
