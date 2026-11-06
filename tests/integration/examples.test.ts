import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The examples double as integration tests of the built packages. They run
// against the output of "pnpm build:examples", as a user's project would.
const examples = fileURLToPath(new URL("../../examples/", import.meta.url));
const cli = fileURLToPath(new URL("../../packages/cli/dist/bin.js", import.meta.url));

function bundledCss(example: string): string {
  const assets = join(examples, example, "dist/assets");
  const file = readdirSync(assets).find((name) => name.endsWith(".css"))!;
  return readFileSync(join(assets, file), "utf8");
}

const built = (example: string) => existsSync(join(examples, example, "dist"));

describe.runIf(built("vanilla"))("vanilla example", () => {
  const css = () => readFileSync(join(examples, "vanilla/dist/croff.css"), "utf8");

  it("generates every class in its HTML", () => {
    const html = readFileSync(join(examples, "vanilla/index.html"), "utf8");
    for (const expression of [
      "bg(dark)",
      "md:padding(12)",
      "hover:bg(brand-dark)",
      "max-width[42rem]",
    ]) {
      expect(html).toContain(expression);
    }
    expect(css()).toContain(".md\\:padding\\(12\\)");
    expect(css()).toContain(".hover\\:bg\\(brand-dark\\):hover");
    expect(css()).toContain(".max-width\\[42rem\\]");
  });

  it("includes the reset and only the variables in use", () => {
    expect(css()).toContain("box-sizing:border-box");
    expect(css()).toContain("--croff-color-brand");
    expect(css()).not.toContain("--croff-color-red");
  });

  it("passes croff check", () => {
    const output = execFileSync(process.execPath, [cli, "check", "--strict"], {
      cwd: join(examples, "vanilla"),
      encoding: "utf8",
    });
    expect(output).toContain("0 errors, 0 warnings");
  });
});

describe.runIf(built("vite-react"))("React and Vite example", () => {
  it("compiles utilities and the custom token", () => {
    const css = bundledCss("vite-react");
    expect(css).toContain("--croff-color-surface:#141414");
    expect(css).toMatch(/\.bg\\\(surface\\\)/);
    expect(css).toMatch(/\.md\\:text-size\\\(5xl\\\)/);
  });

  it("finds expressions in component objects", () => {
    expect(bundledCss("vite-react")).toMatch(/\.hover\\:border-color\\\(brand\\\):hover/);
  });

  it("passes croff check", () => {
    const output = execFileSync(process.execPath, [cli, "check", "--strict"], {
      cwd: join(examples, "vite-react"),
      encoding: "utf8",
    });
    expect(output).toContain("0 errors, 0 warnings");
  });
});

describe.runIf(built("showcase"))("showcase example, through PostCSS", () => {
  it("compiles with the plugin's utility and variant", () => {
    const css = bundledCss("showcase");
    expect(css).toContain("-webkit-line-clamp:3");
    expect(css).toMatch(/\.first\\:bg\\\(brand\\\):first-child/);
    expect(css).not.toContain("@croff");
  });

  it("covers every kind of component", () => {
    const source = readFileSync(join(examples, "showcase/src/App.tsx"), "utf8");
    for (const title of ["Buttons", "Cards", "Navigation", "Forms", "Layouts", "Typography"]) {
      expect(source).toContain(`title="${title}"`);
    }
  });

  it("generates each interactive state", () => {
    const css = bundledCss("showcase");
    for (const pattern of [
      /:hover/,
      /:focus-visible/,
      /:focus-within/,
      /:disabled/,
      /:active/,
      /\.group:hover/,
    ]) {
      expect(css).toMatch(pattern);
    }
  });

  it("passes croff check", () => {
    const output = execFileSync(process.execPath, [cli, "check", "--strict"], {
      cwd: join(examples, "showcase"),
      encoding: "utf8",
    });
    expect(output).toContain("0 errors, 0 warnings");
  });
});
