import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Scanner, watchFiles } from "@croffcss/scanner";

let cwd: string;

async function write(path: string, content: string) {
  const full = join(cwd, path);
  await mkdir(join(full, ".."), { recursive: true });
  await writeFile(full, content);
}

const names = (result: { candidates: { expression: string }[] }) =>
  result.candidates.map((c) => c.expression).sort();

/** Gives a file a chosen timestamp, as if it had been written at that moment. */
const stamp = (path: string, time: Date) => utimes(join(cwd, path), time, time);

const minuteAgo = () => new Date(Date.now() - 60_000);

beforeEach(async () => {
  cwd = await mkdtemp(join(tmpdir(), "croff-scan-"));
});

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true });
});

describe("file discovery", () => {
  it("scans the common file types by default", async () => {
    const samples: Record<string, string> = {
      "index.html": "root(1)",
      "src/a.html": "html(1)",
      "src/b.js": "js(1)",
      "src/c.jsx": "jsx(1)",
      "src/d.ts": "ts(1)",
      "src/e.tsx": "tsx(1)",
      "src/f.vue": "vue(1)",
      "src/g.svelte": "svelte(1)",
      "src/h.astro": "astro(1)",
      "src/i.md": "md(1)",
      "src/j.mdx": "mdx(1)",
      "src/k.css": "css(1)",
      "src/deep/er/l.tsx": "deep(1)",
    };
    for (const [path, expression] of Object.entries(samples)) {
      await write(path, `<a class="${expression}">`);
    }
    const result = await new Scanner({ cwd }).scan();
    expect(names(result)).toEqual(
      Object.values(samples)
        .filter((e) => e !== "css(1)")
        .sort(),
    );
  });

  it("always ignores dependencies and build output", async () => {
    await write("src/node_modules/x/a.js", '"nm(1)"');
    await write("src/dist/a.js", '"dist(1)"');
    await write("src/a.min.js", '"min(1)"');
    await write("src/ok.js", '"ok(1)"');
    expect(names(await new Scanner({ cwd }).scan())).toEqual(["ok(1)"]);
  });

  it("honors custom content and ignore patterns", async () => {
    await write("app/a.php", '"php(1)"');
    await write("app/b.php", '"skip(1)"');
    const scanner = new Scanner({ cwd, content: ["app/**/*.php"], ignore: ["app/b.*"] });
    expect(names(await scanner.scan())).toEqual(["php(1)"]);
  });

  it("deduplicates across files, with stable locations", async () => {
    await write("src/b.html", '<a class="x y(1) gap(4)">');
    await write("src/a.html", '<a class="gap(4)">');
    const { candidates } = await new Scanner({ cwd }).scan();
    expect(candidates).toHaveLength(2);
    expect(candidates.find((c) => c.expression === "gap(4)")?.file).toBe("src/a.html");
  });

  it("aggregates the strongest context across files", async () => {
    await write("src/a.ts", 'const x = "nope(1)"');
    await write("src/b.html", '<a class="nope(1)">');
    const { candidates } = await new Scanner({ cwd }).scan();
    expect(candidates[0]).toMatchObject({ file: "src/a.ts", context: "class" });
  });

  it("collects dynamic and broken expressions per file", async () => {
    await write("src/a.tsx", "<a className={`bg(${c})`} />");
    await write("src/b.html", '<a class="width[calc(1px - 2px)]">');
    const { dynamic, broken } = await new Scanner({ cwd }).scan();
    expect(dynamic).toMatchObject([{ file: "src/a.tsx", text: "bg(${c})" }]);
    expect(broken).toMatchObject([{ file: "src/b.html" }]);
  });
});

describe("missing files", () => {
  it("returns nothing when a directory or pattern matches nothing", async () => {
    const result = await new Scanner({ cwd, content: ["missing/**/*.html", "nope.html"] }).scan();
    expect(result).toMatchObject({ candidates: [], files: 0 });
  });

  it("treats a removed file passed to update as a removal", async () => {
    await write("src/a.html", '"gap(4)"');
    const scanner = new Scanner({ cwd });
    await scanner.scan();
    await rm(join(cwd, "src/a.html"));
    const result = await scanner.update(join(cwd, "src/a.html"));
    expect(result).toMatchObject({ candidates: [], changed: true });
  });
});

describe("incremental behavior", () => {
  it("does not re-read unchanged files", async () => {
    await write("src/a.html", '"gap(4)"');
    await write("src/b.html", '"gap(8)"');
    await stamp("src/a.html", minuteAgo());
    await stamp("src/b.html", minuteAgo());
    const scanner = new Scanner({ cwd });
    expect(await scanner.scan()).toMatchObject({ filesRead: 2, changed: true });
    expect(await scanner.scan()).toMatchObject({ filesRead: 0, changed: false });
  });

  it("notices a same-size edit that kept a recent timestamp", async () => {
    const now = new Date();
    await write("src/a.html", '"gap(4)"');
    await stamp("src/a.html", now);
    const scanner = new Scanner({ cwd });
    await scanner.scan();

    await write("src/a.html", '"gap(8)"');
    await stamp("src/a.html", now);
    const result = await scanner.scan();
    expect(result).toMatchObject({ filesRead: 1, changed: true });
    expect(names(result)).toEqual(["gap(8)"]);
  });

  it("always reads a file again when told that it changed", async () => {
    const old = minuteAgo();
    await write("src/a.html", '"gap(4)"');
    await stamp("src/a.html", old);
    const scanner = new Scanner({ cwd });
    await scanner.scan();

    await write("src/a.html", '"gap(8)"');
    await stamp("src/a.html", old);
    const result = await scanner.update(join(cwd, "src/a.html"));
    expect(result).toMatchObject({ filesRead: 1, changed: true });
    expect(names(result)).toEqual(["gap(8)"]);
  });

  it("stops reading a file once its timestamp has settled", async () => {
    await write("src/a.html", '"gap(4)"');
    const scanner = new Scanner({ cwd });
    expect(await scanner.scan()).toMatchObject({ filesRead: 1 });
    expect(await scanner.scan()).toMatchObject({ filesRead: 1 });

    const later = vi.spyOn(Date, "now").mockReturnValue(Date.now() + 3000);
    try {
      expect(await scanner.scan()).toMatchObject({ filesRead: 1 });
      expect(await scanner.scan()).toMatchObject({ filesRead: 0 });
    } finally {
      later.mockRestore();
    }
  });

  it("detects changes, additions and removals", async () => {
    await write("src/a.html", '"gap(4)"');
    const scanner = new Scanner({ cwd });
    await scanner.scan();

    await write("src/a.html", '"gap(4)" "gap(16)"');
    let result = await scanner.scan();
    expect(result).toMatchObject({ filesRead: 1, changed: true });
    expect(names(result)).toEqual(["gap(16)", "gap(4)"]);

    await write("src/b.html", '"gap(8)"');
    result = await scanner.scan();
    expect(names(result)).toEqual(["gap(16)", "gap(4)", "gap(8)"]);

    await rm(join(cwd, "src/b.html"));
    result = await scanner.scan();
    expect(names(result)).toEqual(["gap(16)", "gap(4)"]);
    expect(result.changed).toBe(true);
  });

  it("reports no change when a file changes but its expressions don't", async () => {
    await write("src/a.html", '"gap(4)"');
    const scanner = new Scanner({ cwd });
    await scanner.scan();
    await write("src/a.html", '"gap(4)" <!-- more text -->');
    const result = await scanner.update(join(cwd, "src/a.html"));
    expect(result).toMatchObject({ filesRead: 1, changed: false });
  });

  it("ignores updates to files outside the patterns", async () => {
    const scanner = new Scanner({ cwd });
    await scanner.scan();
    await write("other/a.html", '"gap(4)"');
    expect(await scanner.update(join(cwd, "other/a.html"))).toMatchObject({
      filesRead: 0,
      candidates: [],
    });
  });
});

describe("matching and roots", () => {
  it("matches absolute and relative paths", () => {
    const scanner = new Scanner({ cwd, content: ["src/**/*.html"] });
    expect(scanner.matches(join(cwd, "src/a.html"))).toBe(true);
    expect(scanner.matches("src/a.html")).toBe(true);
    expect(scanner.matches(join(cwd, "src/a.css"))).toBe(false);
    expect(scanner.matches(join(cwd, "src/node_modules/a.html"))).toBe(false);
    expect(scanner.matches(join(cwd, "../src/a.html"))).toBe(false);
  });

  it("derives watch roots from static prefixes", () => {
    const scanner = new Scanner({
      cwd,
      content: ["src/a/**/*.html", "lib/*.js", "index.html", "**/*.vue"],
    });
    expect(scanner.watchRoots()).toEqual([join(cwd), join(cwd, "lib"), join(cwd, "src/a")].sort());
  });
});

describe("watching", () => {
  it("fires on addition, change and removal of expressions", async () => {
    await write("src/a.html", '"gap(4)"');
    const scanner = new Scanner({ cwd });
    await scanner.scan();

    const nextChange = () => {
      let resolveNext: (value: string[]) => void;
      const promise = new Promise<string[]>((r) => (resolveNext = r));
      handler = (result) => resolveNext(names(result));
      return promise;
    };
    let handler: (
      result: Parameters<Parameters<typeof watchFiles>[1]["onChange"]>[0],
    ) => void = () => {};
    const handle = watchFiles(scanner, { debounceMs: 10, onChange: (result) => handler(result) });

    try {
      let change = nextChange();
      await write("src/a.html", '"gap(8)"');
      expect(await change).toEqual(["gap(8)"]);

      change = nextChange();
      await write("src/b.html", '"gap(12)"');
      expect(await change).toEqual(["gap(12)", "gap(8)"]);

      change = nextChange();
      await rm(join(cwd, "src/b.html"));
      expect(await change).toEqual(["gap(8)"]);
    } finally {
      handle.close();
    }
  });

  it("does not throw for a missing root", () => {
    const scanner = new Scanner({ cwd, content: ["nothing/**/*.html"] });
    const handle = watchFiles(scanner, { onChange: () => {} });
    handle.close();
  });
});
