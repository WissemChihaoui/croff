import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { run, type Output } from "../src/index.js";
import { patchViteConfig } from "../src/commands/init.js";

let cwd: string;

const write = async (path: string, content: string) => {
  const full = join(cwd, path);
  await mkdir(join(full, ".."), { recursive: true });
  await writeFile(full, content);
};
const read = (path: string) => readFile(join(cwd, path), "utf8");

async function croff(...args: string[]) {
  const logs: string[] = [];
  const errors: string[] = [];
  const output: Output = {
    log: (message) => logs.push(message),
    error: (message) => errors.push(message),
  };
  const code = await run([...args], output);
  return { code, stdout: logs.join("\n"), stderr: errors.join("\n") };
}

beforeEach(async () => {
  cwd = await mkdtemp(join(tmpdir(), "croff-cli-"));
});

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true });
});

describe("help", () => {
  it("prints the main help with no arguments", async () => {
    const { code, stdout } = await croff();
    expect(code).toBe(0);
    for (const command of ["init", "dev", "build", "check"]) expect(stdout).toContain(command);
  });

  it("prints the version", async () => {
    expect((await croff("--version")).stdout).toBe("0.1.0");
  });

  it.each(["init", "dev", "build", "check"])("prints help for %s", async (command) => {
    const { code, stdout } = await croff(command, "--help");
    expect(code).toBe(0);
    expect(stdout).toContain(`croff ${command}`);
    expect(stdout).toContain("--help");
  });

  it("fails on unknown commands and options", async () => {
    const unknown = await croff("nonsense");
    expect(unknown.code).toBe(1);
    expect(unknown.stderr).toContain('Unknown command "nonsense"');

    const option = await croff("build", "--nonsense");
    expect(option.code).toBe(1);
    expect(option.stderr).toContain("--nonsense");
  });
});

describe("init", () => {
  it("sets up a plain project for the CLI", async () => {
    await write("index.html", "<p>x</p>");
    const { code, stdout } = await croff("init", "--cwd", cwd);
    expect(code).toBe(0);
    expect(stdout).toContain("no build tool");
    expect(await read("croff.config.mjs")).toContain('output: "dist/croff.css"');
    expect(await read("croff.css")).toContain("@croff;");
    expect(stdout).toContain("croff build");
  });

  it("detects Vite with React and TypeScript, and patches the config", async () => {
    await write(
      "package.json",
      JSON.stringify({ devDependencies: { vite: "*", react: "*", typescript: "*" } }),
    );
    await write(
      "vite.config.ts",
      `import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\n\nexport default defineConfig({\n  plugins: [react()],\n});\n`,
    );
    await mkdir(join(cwd, "src"));
    const { code, stdout } = await croff("init", "--cwd", cwd);
    expect(code).toBe(0);
    expect(stdout).toContain("vite");
    expect(stdout).toContain("react and TypeScript");
    expect(await read("croff.config.ts")).toContain("defineConfig");
    expect(await read("src/croff.css")).toContain("@croff;");
    const vite = await read("vite.config.ts");
    expect(vite).toContain(`import croff from "@croff/vite";`);
    expect(vite).toContain("plugins: [croff(), react()]");
  });

  it("only asks for packages that aren't installed, and reports edits as edits", async () => {
    await write(
      "package.json",
      JSON.stringify({ devDependencies: { vite: "*", "@croff/core": "*", "@croff/vite": "*" } }),
    );
    await write("vite.config.js", "export default { plugins: [] };\n");
    const { stdout } = await croff("init", "--cwd", cwd);
    expect(stdout).not.toContain("Install the packages");
    expect(stdout).toContain("Updated vite.config.js");
    expect(stdout).not.toContain("Created vite.config.js");
  });

  it("explains the manual step if a Vite config can't be patched", async () => {
    await write("package.json", JSON.stringify({ devDependencies: { vite: "*" } }));
    await write("vite.config.js", "export default buildConfig();\n");
    const { stdout } = await croff("init", "--cwd", cwd);
    expect(stdout).toContain("Add the plugin to your Vite config");
    expect(await read("vite.config.js")).toBe("export default buildConfig();\n");
  });

  it("sets up PostCSS", async () => {
    await write("package.json", JSON.stringify({ dependencies: { next: "*" } }));
    const { stdout } = await croff("init", "--cwd", cwd);
    expect(stdout).toContain("postcss");
    expect(await read("postcss.config.mjs")).toContain("@croff/postcss");
  });

  it("never overwrites existing files", async () => {
    await write("croff.config.ts", "// mine");
    await write("croff.css", "/* mine */");
    const { stdout } = await croff("init", "--cwd", cwd);
    expect(stdout).toContain("Kept existing");
    expect(await read("croff.config.ts")).toBe("// mine");
    expect(await read("croff.css")).toBe("/* mine */");
  });

  it("writes nothing during a dry run", async () => {
    const { stdout } = await croff("init", "--cwd", cwd, "--dry-run");
    expect(stdout).toContain("Would create");
    expect(existsSync(join(cwd, "croff.css"))).toBe(false);
  });

  it("rejects unknown integrations", async () => {
    expect((await croff("init", "--cwd", cwd, "--integration", "webpack")).code).toBe(1);
  });

  it("is idempotent when patching Vite", () => {
    const once = patchViteConfig(`export default { plugins: [] };\n`)!;
    expect(patchViteConfig(once)).toBe(once);
    expect(once).toContain("plugins: [croff()]");
  });

  it("produces a project that builds", async () => {
    await write("index.html", '<p class="gap(4)">x</p>');
    await croff("init", "--cwd", cwd);
    // The generated config imports @croff/core, which a temp directory can't resolve.
    await write(
      "croff.config.mjs",
      `export default { content: ["*.html"], input: "croff.css", output: "dist/croff.css" };`,
    );
    const { code } = await croff("build", "--cwd", cwd);
    expect(code).toBe(0);
    const css = await read("dist/croff.css");
    expect(css).toContain("box-sizing:border-box");
    expect(css).toContain(".gap\\(4\\)");
  });
});

describe("build", () => {
  beforeEach(async () => {
    await write("src/a.html", '<a class="gap(4) md:gap(8)">');
    await write("src/unused.html", "<a></a>");
  });

  it("writes minified CSS with only the utilities in use", async () => {
    const { code, stdout } = await croff("build", "--cwd", cwd, "-o", "out/a.css");
    expect(code).toBe(0);
    expect(stdout).toContain("2 rules");
    const css = await read("out/a.css");
    expect(css).toBe(
      ":root{--croff-spacing-4:1rem;--croff-spacing-8:2rem}.gap\\(4\\){gap:var(--croff-spacing-4)}@media (min-width:768px){.md\\:gap\\(8\\){gap:var(--croff-spacing-8)}}",
    );
  });

  it("is deterministic", async () => {
    await croff("build", "--cwd", cwd, "-o", "a.css");
    await write("src/z.html", '<a class="gap(4)">');
    await croff("build", "--cwd", cwd, "-o", "b.css");
    expect(await read("a.css")).toBe(await read("b.css"));
  });

  it("can keep the output readable", async () => {
    await croff("build", "--cwd", cwd, "-o", "a.css", "--no-minify");
    expect(await read("a.css")).toContain("{\n  gap: var(--croff-spacing-4);\n}");
  });

  it("removes CSS when a utility is no longer used", async () => {
    await croff("build", "--cwd", cwd, "-o", "a.css");
    await write("src/a.html", '<a class="gap(4)">');
    await croff("build", "--cwd", cwd, "-o", "a.css");
    expect(await read("a.css")).not.toContain("md");
  });

  it("reads output and input from the config", async () => {
    await write("croff.config.mjs", `export default { input: "in.css", output: "out.css" };`);
    await write("in.css", "/* comment */\n.mine { color: red; }\n@croff;\n");
    await croff("build", "--cwd", cwd);
    const css = await read("out.css");
    expect(css).toContain(".mine{color:red}");
    expect(css).toContain(".gap\\(4\\)");
    expect(css).not.toContain("comment");
    expect(css).not.toContain("@croff");
  });

  it("writes a source map", async () => {
    await croff("build", "--cwd", cwd, "-o", "out/a.css", "--sourcemap");
    expect(await read("out/a.css")).toContain("/*# sourceMappingURL=a.css.map */");
    const map = JSON.parse(await read("out/a.css.map"));
    expect(map).toMatchObject({ version: 3, file: "a.css", sources: ["../src/a.html"] });
  });

  it("fails without writing when an expression is invalid", async () => {
    await write("src/a.html", '<a class="pad(4)">');
    const { code, stderr } = await croff("build", "--cwd", cwd, "-o", "a.css");
    expect(code).toBe(1);
    expect(stderr).toContain("Unknown utility");
    expect(stderr).toContain('Did you mean "padding"?');
    expect(existsSync(join(cwd, "a.css"))).toBe(false);
  });

  it("needs an output", async () => {
    const { code, stderr } = await croff("build", "--cwd", cwd);
    expect(code).toBe(1);
    expect(stderr).toContain("No output file");
  });

  it("reports a missing input", async () => {
    const { code, stderr } = await croff("build", "--cwd", cwd, "-o", "a.css", "-i", "nope.css");
    expect(code).toBe(1);
    expect(stderr).toContain("Input stylesheet not found");
  });

  it("warns when nothing matches", async () => {
    await write("croff.config.mjs", `export default { content: ["nope/**"] };`);
    const { code, stderr } = await croff("build", "--cwd", cwd, "-o", "a.css");
    expect(code).toBe(0);
    expect(stderr).toContain("No files matched");
  });

  it("uses --config", async () => {
    await write("custom.config.mjs", `export default { theme: { spacing: { 4: "99px" } } };`);
    await croff("build", "--cwd", cwd, "-o", "a.css", "-c", "custom.config.mjs");
    expect(await read("a.css")).toContain("--croff-spacing-4:99px");
  });
});

describe("check", () => {
  it("passes a clean project", async () => {
    await write("src/a.html", '<a class="gap(4)">');
    const { code, stdout } = await croff("check", "--cwd", cwd);
    expect(code).toBe(0);
    expect(stdout).toContain("0 errors, 0 warnings");
    expect(stdout).toContain("1 utilities in 1 files");
  });

  it("reports unknown utilities, invalid values and whitespace", async () => {
    await write("src/a.html", `<a class="pad(4) gap(banana) width[calc(1px - 2px)] gap(4">`);
    const { code, stderr } = await croff("check", "--cwd", cwd);
    expect(code).toBe(1);
    expect(stderr).toContain('src/a.html:1:11: error unknown-utility: Unknown utility "pad"');
    expect(stderr).toContain("invalid-argument");
    expect(stderr).toContain("whitespace");
  });

  it("reports dynamic expressions as warnings, and fails on them with --strict", async () => {
    await write("src/a.tsx", "<a className={`bg(${c})`} />");
    const relaxed = await croff("check", "--cwd", cwd);
    expect(relaxed.code).toBe(0);
    expect(relaxed.stderr).toContain("dynamic-expression");
    expect((await croff("check", "--cwd", cwd, "--strict")).code).toBe(1);
  });

  it("validates theme tokens", async () => {
    await write("croff.config.mjs", `export default { theme: { spacing: { 1: "wide" } } };`);
    const { code, stderr } = await croff("check", "--cwd", cwd);
    expect(code).toBe(1);
    expect(stderr).toContain("invalid-token-value");
    expect(stderr).toContain("should be a CSS length");
  });

  it("reports config load failures", async () => {
    await write("croff.config.mjs", "export default 1");
    const { code, stderr } = await croff("check", "--cwd", cwd);
    expect(code).toBe(1);
    expect(stderr).toContain("must export a configuration object");
  });

  it("checks the input stylesheet", async () => {
    await write("croff.config.mjs", `export default { input: "missing.css" };`);
    const { code, stderr } = await croff("check", "--cwd", cwd);
    expect(code).toBe(1);
    expect(stderr).toContain("input stylesheet does not exist");
  });

  it("can print JSON", async () => {
    await write("src/a.html", '<a class="pad(4)">');
    const { stdout } = await croff("check", "--cwd", cwd, "--json");
    const report = JSON.parse(stdout);
    expect(report).toMatchObject({
      files: 1,
      expressions: 1,
      valid: 0,
      diagnostics: [{ code: "unknown-utility", suggestion: "padding(4)", line: 0, column: 10 }],
    });
  });
});

describe("dev", () => {
  it("builds once with --once, tolerating errors", async () => {
    await write("src/a.html", '<a class="gap(4) pad(4)">');
    const { code, stderr } = await croff("dev", "--cwd", cwd, "-o", "a.css", "--once");
    expect(code).toBe(0);
    expect(stderr).toContain("Unknown utility");
    expect(await read("a.css")).toContain(".gap\\(4\\)");
  });

  it("needs an output", async () => {
    expect((await croff("dev", "--cwd", cwd)).code).toBe(1);
  });

  it("rebuilds when sources change, in a real process", async () => {
    await write("src/a.html", '<a class="gap(4)">');
    const bin = fileURLToPath(new URL("../dist/bin.js", import.meta.url));
    const child = spawn(process.execPath, [bin, "dev", "--cwd", cwd, "-o", "a.css"]);
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));

    const waitFor = async (predicate: () => boolean | Promise<boolean>, what: string) => {
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline) {
        if (await predicate()) return;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      throw new Error(`Timed out waiting for ${what}. Output:\n${output}`);
    };

    try {
      await waitFor(() => output.includes("Watching"), "the watcher to start");
      expect(await read("a.css")).toContain(".gap\\(4\\)");

      await write("src/a.html", '<a class="gap(8)">');
      await waitFor(async () => (await read("a.css")).includes(".gap\\(8\\)"), "a rebuild");

      await write("src/b.html", '<a class="gap(12)">');
      await waitFor(async () => (await read("a.css")).includes(".gap\\(12\\)"), "a new file");

      await rm(join(cwd, "src/b.html"));
      await waitFor(async () => !(await read("a.css")).includes(".gap\\(12\\)"), "a removal");
    } finally {
      child.kill();
      await new Promise((resolve) => child.once("close", resolve));
    }
  });
});

describe("source maps with an input stylesheet", () => {
  it("writes a map for build and dev", async () => {
    await write("src/a.html", '<a class="gap(4)">');
    await write("in.css", ".mine { color: red; }\n@croff;\n");
    const built = await croff(
      "build",
      "--cwd",
      cwd,
      "-i",
      "in.css",
      "-o",
      "out/a.css",
      "--sourcemap",
    );
    expect(built.code).toBe(0);
    expect(await read("out/a.css")).toContain("/*# sourceMappingURL=a.css.map */");
    expect(JSON.parse(await read("out/a.css.map"))).toMatchObject({
      version: 3,
      file: "a.css",
      sources: ["../src/a.html"],
    });

    await croff("dev", "--cwd", cwd, "-i", "in.css", "-o", "dev.css", "--sourcemap", "--once");
    expect(JSON.parse(await read("dev.css.map")).sources).toEqual(["src/a.html"]);
  });
});

describe("unsupported grouping syntax", () => {
  beforeEach(async () => {
    await write("src/a.html", '<a class="gap(4) hover:(bg(brand),color(white))">');
  });

  it("is reported by check, with its position and what to do instead", async () => {
    const { code, stderr } = await croff("check", "--cwd", cwd);
    expect(code).toBe(1);
    expect(stderr).toContain("src/a.html:1:18: error unsupported-group");
    expect(stderr).toContain("Variant groups aren't supported.");
    expect(stderr).toContain('each starting with "hover:"');
  });

  it("doesn't stop dev from compiling everything else", async () => {
    const { code, stderr } = await croff("dev", "--cwd", cwd, "-o", "a.css", "--once");
    expect(code).toBe(0);
    expect(stderr).toContain("unsupported-group");
    const css = await read("a.css");
    expect(css).toContain(".gap\\(4\\)");
    expect(css).not.toContain("hover");
  });

  it("fails build, like any other invalid class", async () => {
    const { code } = await croff("build", "--cwd", cwd, "-o", "a.css");
    expect(code).toBe(1);
    expect(existsSync(join(cwd, "a.css"))).toBe(false);
  });
});
