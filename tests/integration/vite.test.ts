import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { build, createServer, type ViteDevServer } from "vite";
import croff from "@croff/vite";

let root: string;
const write = async (path: string, content: string) => {
  const full = join(root, path);
  await mkdir(join(full, ".."), { recursive: true });
  await writeFile(full, content);
};

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "croff-vite-"));
  await write(
    "index.html",
    '<div class="gap(4)"></div><script type="module" src="/src/main.js"></script>',
  );
  await write("src/main.js", 'import "./style.css";\nexport const cls = "padding(2)";\n');
  await write("src/style.css", ".mine { color: red; }\n@croff;\n");
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("production build", () => {
  async function run(extra = {}) {
    await build({
      root,
      logLevel: "silent",
      plugins: [croff()],
      build: { outDir: "dist" },
      ...extra,
    });
    const assets = await readdir(join(root, "dist/assets"));
    const cssFile = assets.find((file) => file.endsWith(".css"));
    return readFile(join(root, "dist/assets", cssFile!), "utf8");
  }

  it("emits only the utilities in use, next to the user's CSS", async () => {
    const css = await run();
    expect(css).toContain(".mine");
    expect(css).toMatch(/\.gap\\\(4\\\)\{gap:var\(--croff-spacing-4\)\}/);
    expect(css).toMatch(/\.padding\\\(2\\\)\{padding:var\(--croff-spacing-2\)\}/);
    expect(css).toContain("--croff-spacing-4:1rem");
    expect(css).not.toContain("--croff-color");
    expect(css).not.toContain("@croff");
  });

  it("is deterministic", async () => {
    const first = await run();
    const second = await run();
    expect(second).toBe(first);
  });

  it("honors the config file and the config option", async () => {
    await write("croff.config.mjs", `export default { theme: { spacing: { 4: "11px" } } };`);
    expect(await run()).toContain("--croff-spacing-4:11px");

    await write("other.mjs", `export default { theme: { spacing: { 4: "22px" } } };`);
    await rm(join(root, "dist"), { recursive: true });
    const css = await run({ plugins: [croff({ config: "other.mjs" })] });
    expect(css).toContain("--croff-spacing-4:22px");
  });

  it("leaves stylesheets without a directive alone", async () => {
    await write("src/style.css", ".mine { color: red; }\n");
    const css = await run();
    expect(css).not.toContain(".gap");
  });

  it("survives invalid expressions with a logged error, not a crash", async () => {
    await write("src/main.js", 'import "./style.css";\n');
    await write(
      "index.html",
      '<div class="pad(4) gap(8)"></div><script type="module" src="/src/main.js"></script>',
    );
    const css = await run();
    expect(css).toMatch(/\.gap\\\(8\\\)/);
  });
});

describe("development server", () => {
  let server: ViteDevServer;
  const logged: string[] = [];

  beforeEach(async () => {
    logged.length = 0;
    server = await createServer({
      root,
      configFile: false,
      plugins: [croff()],
      server: { middlewareMode: true, hmr: { port: 0 } },
      appType: "custom",
      customLogger: {
        info() {},
        warn: (message: string) => logged.push(message),
        warnOnce() {},
        error: (message: string) => logged.push(message),
        clearScreen() {},
        hasErrorLogged: () => false,
        hasWarned: false,
      },
    });
  });

  afterEach(async () => {
    await server.close();
  });

  const styles = async () => {
    const result = await server.transformRequest("/src/style.css");
    return result?.code ?? "";
  };

  async function eventually(predicate: () => Promise<boolean>, what: string) {
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      if (await predicate()) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`Timed out waiting for ${what}`);
  }

  it("compiles on request", async () => {
    const code = await styles();
    expect(code).toContain("gap(4)".replace(/[()]/g, "\\\\$&"));
    expect(code).toContain("--croff-spacing-4");
  });

  it("updates when a source file changes, is added or is removed", async () => {
    await styles();

    await write("src/main.js", 'import "./style.css";\nexport const cls = "padding(8)";\n');
    await eventually(async () => (await styles()).includes("--croff-spacing-8"), "a change");

    await write("src/new.js", 'export const cls = "margin(12)";\n');
    await eventually(async () => (await styles()).includes("--croff-spacing-12"), "an addition");

    await rm(join(root, "src/new.js"));
    await eventually(async () => !(await styles()).includes("--croff-spacing-12"), "a removal");
  });

  it("doesn't invalidate the stylesheet when the set of utilities is unchanged", async () => {
    const before = await styles();
    const module = await server.moduleGraph.getModuleByUrl("/src/style.css");
    const stamp = module!.lastInvalidationTimestamp;

    await write(
      "src/main.js",
      'import "./style.css";\nexport const cls = "padding(2)"; // edited\n',
    );
    await new Promise((resolve) => setTimeout(resolve, 500));

    const after = await server.moduleGraph.getModuleByUrl("/src/style.css");
    expect(after!.lastInvalidationTimestamp).toBe(stamp);
    expect(await styles()).toBe(before);
  });

  it("logs diagnostics once", async () => {
    await write("src/main.js", 'import "./style.css";\nexport const cls = "cx";\n');
    await write("src/bad.html", '<a class="pad(4)">');
    await write("index.html", "<div></div>");
    await eventually(async () => {
      await styles();
      return logged.some((message) => message.includes("Unknown utility"));
    }, "a diagnostic");
    const count = logged.filter((message) => message.includes("Unknown utility")).length;
    expect(count).toBe(1);
  });
});

describe("configuration changes in the dev server", () => {
  const wait = async (predicate: () => Promise<boolean>, what: string) => {
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      try {
        if (await predicate()) return;
      } catch {
        // The server may be mid-restart.
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Timed out waiting for ${what}`);
  };

  const start = () =>
    createServer({
      root,
      configFile: false,
      plugins: [croff()],
      server: { middlewareMode: true, hmr: { port: 0 } },
      appType: "custom",
      logLevel: "silent",
    });

  const compiled = async (server: ViteDevServer) =>
    (await server.transformRequest("/src/style.css"))?.code ?? "";

  it("applies edits to the config, even with an inline plugin instance", async () => {
    await write("croff.config.mjs", `export default { theme: { spacing: { 4: "11px" } } };`);
    const server = await start();
    try {
      expect(await compiled(server)).toContain("11px");
      await new Promise((resolve) => setTimeout(resolve, 500));
      await write("croff.config.mjs", `export default { theme: { spacing: { 4: "22px" } } };`);
      await wait(async () => (await compiled(server)).includes("22px"), "the new token");
    } finally {
      await server.close();
    }
  });

  it("notices a config file created after startup", async () => {
    const server = await start();
    try {
      expect(await compiled(server)).toContain("1rem");
      await new Promise((resolve) => setTimeout(resolve, 500));
      await write("croff.config.mjs", `export default { theme: { spacing: { 4: "33px" } } };`);
      await wait(async () => (await compiled(server)).includes("33px"), "the new config");
    } finally {
      await server.close();
    }
  });
});

describe("unsupported grouping syntax through Vite", () => {
  it("doesn't stop a build from compiling everything else", async () => {
    await write(
      "index.html",
      '<div class="gap(4) md:(gap(8),hover:bg(brand))"></div><script type="module" src="/src/main.js"></script>',
    );
    await write("src/main.js", 'import "./style.css";');
    await build({ root, logLevel: "silent", plugins: [croff()], build: { outDir: "dist" } });
    const assets = await readdir(join(root, "dist/assets"));
    const css = await readFile(
      join(
        root,
        "dist/assets",
        assets.find((f) => f.endsWith(".css"))!,
      ),
      "utf8",
    );
    expect(css).toContain("--croff-spacing-4:1rem");
    expect(css).not.toContain("--croff-spacing-8");
    expect(css).not.toContain("hover");
  });
});
