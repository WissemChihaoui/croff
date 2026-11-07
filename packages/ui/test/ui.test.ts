import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement as h } from "react";
import { renderToStaticMarkup as render } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createCroff } from "@croffcss/core";
import * as recipes from "@croffcss/ui";
import { uiPlugin } from "@croffcss/ui/plugin";
import {
  Avatar,
  Alert,
  Badge,
  Button,
  Field,
  Input,
  Progress,
  Spinner,
  Switch,
  Table,
  Tabs,
} from "@croffcss/ui/react";

const tones = ["neutral", "brand", "success", "warning", "danger", "info"] as const;
const sizes = ["sm", "md", "lg"] as const;

/** Every class any recipe can produce, in every variation. */
function everyClass(): string[] {
  const lists = [
    recipes.page(),
    ...(["sm", "md", "lg", "xl"] as const).map((size) => recipes.heading({ size })),
    recipes.eyebrow(),
    recipes.kbd(),
    ...(["primary", "secondary", "ghost", "danger"] as const).flatMap((tone) =>
      sizes.map((size) => recipes.button({ tone, size, block: true })),
    ),
    ...tones.flatMap((tone) => [recipes.badge({ tone }), recipes.alert({ tone })]),
    recipes.card({ interactive: true }),
    recipes.cardTitle(),
    recipes.cardBody(),
    recipes.alertTitle(),
    recipes.field(),
    recipes.label(),
    recipes.hint(),
    recipes.fieldError(),
    recipes.input(),
    recipes.textarea(),
    recipes.select(),
    recipes.choice(),
    recipes.checkbox(),
    recipes.radio(),
    recipes.switchControl(),
    recipes.tabList(),
    recipes.tab(),
    recipes.tabPanel(),
    recipes.dialog(),
    recipes.dialogTitle(),
    recipes.dialogBody(),
    recipes.dialogActions(),
    recipes.accordionItem(),
    recipes.accordionSummary(),
    recipes.accordionMarker(),
    recipes.accordionBody(),
    recipes.progress(),
    recipes.progressBar(),
    recipes.spinner(),
    recipes.spinner({ inherit: true }),
    recipes.skeleton(),
    ...sizes.map((size) => recipes.avatar({ size })),
    recipes.avatarImage(),
    recipes.tableWrap(),
    recipes.table(),
    recipes.tableCaption(),
    recipes.tableHeader(),
    recipes.tableRow(),
    recipes.tableCell(),
  ];
  return [...new Set(lists.flatMap((list) => list.split(/\s+/)))];
}

describe("recipes", () => {
  const engine = createCroff({ plugins: [uiPlugin] });

  it("use only classes that compile", () => {
    const { failures } = engine.compile(everyClass());
    expect(failures.map((failure) => `${failure.expression}: ${failure.error.message}`)).toEqual(
      [],
    );
  });

  it("add a caller's class, and leave out empty ones", () => {
    expect(recipes.cx("a", false, null, undefined, "", "b")).toBe("a b");
    expect(recipes.button({ className: "mine" }).split(" ")).toContain("mine");
  });

  it("default to the primary, medium button", () => {
    expect(recipes.button()).toBe(recipes.button({ tone: "primary", size: "md" }));
  });

  const stylesheet = fileURLToPath(new URL("../dist/styles.css", import.meta.url));

  it.runIf(existsSync(stylesheet))("all reach the prebuilt stylesheet", () => {
    const css = readFileSync(stylesheet, "utf8").replace(/\s+/g, " ");
    const { rules } = engine.compile(everyClass());
    const missing = rules
      .filter((rule) => !css.includes(rule.selector))
      .map((rule) => rule.expression);
    expect(missing).toEqual([]);
    expect(css).toContain('[data-theme="light"]');
    expect(css).toContain("@keyframes croff-ui-sweep");
  });
});

describe("plugin", () => {
  it("can be added to a project, for writing components in the same language", () => {
    const { css, failures } = createCroff({ plugins: [uiPlugin] }).compile([
      "cut(md)",
      "checked:bg(brand)",
      "bg(surface)",
    ]);
    expect(failures).toEqual([]);
    expect(css).toContain("clip-path: polygon(0.875rem 0");
    expect(css).toContain(":checked");
    expect(css).toContain("--croff-color-surface");
  });

  it("gives way to a project's own tokens", () => {
    const { css } = createCroff({
      plugins: [uiPlugin],
      theme: { colors: { brand: "#ff5c00" } },
    }).compile(["bg(brand)"]);
    expect(css).toContain("--croff-color-brand: #ff5c00;");
  });
});

describe("React components", () => {
  it("renders a link when a button has an href", () => {
    const html = render(h(Button, { href: "/a" }, "Go"));
    expect(html).toMatch(/^<a /);
    expect(html).toContain('href="/a"');
    expect(html).not.toContain("<button");
  });

  it("makes a plain button that won't submit a form by accident", () => {
    expect(render(h(Button, null, "Go"))).toContain('type="button"');
    expect(render(h(Button, { type: "submit" }, "Go"))).toContain('type="submit"');
  });

  it("disables a loading button, and says it's busy", () => {
    const html = render(h(Button, { loading: true }, "Save"));
    expect(html).toContain("disabled");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Save");
  });

  it("connects a field's label, hint and control", () => {
    const html = render(h(Field, { label: "Name", hint: "Your full name", children: h(Input) }));
    const id = /<input[^>]* id="([^"]+)"/.exec(html)![1]!;
    expect(html).toContain(`for="${id}"`);
    const described = /aria-describedby="([^"]+)"/.exec(html)![1]!;
    expect(html).toContain(`<p id="${described}"`);
    expect(html).not.toContain("aria-invalid");
  });

  it("shows an error in place of a hint, and marks the control invalid", () => {
    const html = render(
      h(Field, { label: "Name", hint: "Hint", error: "Required", children: h(Input) }),
    );
    expect(html).toContain("Required");
    expect(html).not.toContain("Hint");
    expect(html).toContain('aria-invalid="true"');
  });

  it("keeps an id the control already has", () => {
    expect(render(h(Field, { label: "Name", children: h(Input, { id: "mine" }) }))).toContain(
      'for="mine"',
    );
  });

  it("gives a switch its role", () => {
    const html = render(h(Switch, { label: "On" }));
    expect(html).toContain('role="switch"');
    expect(html).toContain('type="checkbox"');
  });

  it("keeps progress within its range", () => {
    expect(render(h(Progress, { value: 140, label: "x" }))).toContain('aria-valuenow="100"');
    expect(render(h(Progress, { value: -5, label: "x" }))).toContain('aria-valuenow="0"');
    expect(render(h(Progress, { value: 40, label: "Upload" }))).toContain('aria-label="Upload"');
  });

  it("announces a spinner", () => {
    const html = render(h(Spinner));
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Loading"');
  });

  it("names an avatar, with initials or an image", () => {
    const initials = render(h(Avatar, { name: "Ada Byron King" }));
    expect(initials).toContain('aria-label="Ada Byron King"');
    expect(initials).toContain(">AK<");
    expect(render(h(Avatar, { name: "Ada", src: "/a.png" }))).toContain('alt="Ada"');
  });

  it("connects tabs to their panels, with only the selected one reachable", () => {
    const items = [
      { id: "a", label: "A", content: "First" },
      { id: "b", label: "B", content: "Second" },
    ];
    const html = render(h(Tabs, { items, label: "Sections" }));
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-label="Sections"');
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html.match(/tabindex="-1"/g)).toHaveLength(1);
    expect(html.match(/hidden=""/g)).toHaveLength(1);
  });

  it("marks up a table with column headers", () => {
    const html = render(
      h(Table, {
        caption: "People",
        columns: [{ key: "name", label: "Name" }],
        rows: [{ id: "1", name: "Ada" }],
      }),
    );
    expect(html).toContain('scope="col"');
    expect(html).toContain("<caption");
    expect(html).toContain("Ada");
  });

  it("passes props through to the element", () => {
    expect(render(h(Badge, { tone: "success", title: "t" }, "x"))).toContain('title="t"');
    expect(render(h(Alert, { role: "alert" }, "x"))).toContain('role="alert"');
  });
});
