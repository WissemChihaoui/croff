import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import postcss from "postcss";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import croff from "@croff/postcss";

let cwd: string;
const write = async (path: string, content: string) => {
  const full = join(cwd, path);
  await mkdir(join(full, ".."), { recursive: true });
  await writeFile(full, content);
};

const run = (css: string, from = join(cwd, "src/in.css")) =>
  postcss([croff({ cwd })]).process(css, { from, to: join(cwd, "out.css") });

beforeEach(async () => {
  cwd = await mkdtemp(join(tmpdir(), "croff-postcss-"));
  await write("src/a.html", '<a class="gap(4) md:hover:bg(brand)">');
});

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true });
});

describe("PostCSS plugin", () => {
  it("replaces the directive with generated CSS", async () => {
    const { css } = await run(".mine { color: red; }\n@croff;\n.after { color: blue; }");
    expect(css).toContain(".gap\\(4\\)");
    expect(css).toContain("--croff-color-brand");
    expect(css).toContain("@media (min-width: 768px)");
    expect(css).not.toContain("@croff");
    expect(css.indexOf(".mine")).toBeLessThan(css.indexOf(".gap"));
    expect(css.indexOf(".gap")).toBeLessThan(css.indexOf(".after"));
  });

  it("supports separate layers", async () => {
    const { css } = await run("@croff reset;\n@croff theme;\n.x{}\n@croff utilities;");
    expect(css.indexOf("box-sizing")).toBeLessThan(css.indexOf(":root"));
    expect(css.indexOf(":root")).toBeLessThan(css.indexOf(".x"));
    expect(css.indexOf(".x")).toBeLessThan(css.indexOf(".gap"));
  });

  it("is a no-op without a directive", async () => {
    const { css, messages } = await run(".mine { color: red; }");
    expect(css).toBe(".mine { color: red; }");
    expect(messages).toEqual([]);
  });

  it("registers dependencies for watch mode", async () => {
    await write("croff.config.mjs", `export default { content: ["src/**/*.html", "index.html"] };`);
    const { messages } = await postcss([croff({ cwd: cwd })]).process("@croff;", {
      from: join(cwd, "src/in2.css"),
    });
    expect(messages).toContainEqual(
      expect.objectContaining({
        type: "dir-dependency",
        dir: join(cwd, "src"),
        glob: "**/*.html",
      }),
    );
    expect(messages).toContainEqual(
      expect.objectContaining({ type: "dependency", file: join(cwd, "croff.config.mjs") }),
    );
  });

  it("sees source changes between runs", async () => {
    expect((await run("@croff;")).css).not.toContain(".gap\\(8\\)");
    await write("src/a.html", '<a class="gap(8)">');
    const { css } = await run("@croff;");
    expect(css).toContain(".gap\\(8\\)");
    expect(css).not.toContain(".gap\\(4\\)");
  });

  it("reports diagnostics as warnings", async () => {
    await write("src/a.html", '<a class="pad(4)">');
    const result = await run("@croff;");
    expect(result.warnings().map((w) => w.text)).toEqual([
      expect.stringContaining('Unknown utility "pad"'),
    ]);
  });

  it("rejects unknown directives with a position", async () => {
    await expect(run("\n@croff nonsense;")).rejects.toThrow(/Unknown directive[\s\S]*/);
    await expect(run("\n@croff nonsense;")).rejects.toMatchObject({ line: 2 });
  });

  it("attributes generated nodes to the directive", async () => {
    const { root } = await run("/**/\n@croff;");
    root.walkRules((rule) => {
      expect(rule.source?.start?.line).toBe(2);
    });
  });
});

describe("PostCSS watch mode", () => {
  it("picks up edits to the config between runs", async () => {
    await write("croff.config.mjs", `export default { theme: { spacing: { 4: "11px" } } };`);
    expect((await run("@croff;")).css).toContain("--croff-spacing-4: 11px");
    await write("croff.config.mjs", `export default { theme: { spacing: { 4: "22px" } } };`);
    expect((await run("@croff;")).css).toContain("--croff-spacing-4: 22px");
  });

  it("picks up a config created between runs", async () => {
    expect((await run("@croff;")).css).toContain("--croff-spacing-4: 1rem");
    await write("croff.config.mjs", `export default { theme: { spacing: { 4: "33px" } } };`);
    expect((await run("@croff;")).css).toContain("--croff-spacing-4: 33px");
  });
});

describe("variant groups through PostCSS", () => {
  it("compiles them", async () => {
    await write("src/a.html", '<a class="md:(gap(8),hover:bg(brand))">');
    const { css } = await run("@croff;");
    expect(css).toContain("@media (min-width: 768px)");
    expect(css).toContain(".md\\:\\(gap\\(8\\)\\,hover\\:bg\\(brand\\)\\):hover");
  });

  it("reports failing members as warnings", async () => {
    await write("src/a.html", '<a class="md:(pad(4))">');
    const result = await run("@croff;");
    expect(result.warnings().map((w) => w.text)).toEqual([
      expect.stringContaining('Unknown utility "pad"'),
    ]);
  });
});
