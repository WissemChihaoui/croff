// Benchmarks for parsing, compilation and scanning. Run with: pnpm build && pnpm bench
// Methodology is documented at /docs/advanced/performance in the documentation site.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { cpus, tmpdir } from "node:os";
import { join } from "node:path";
import { createCroff, parse } from "../packages/core/dist/index.js";
import { Scanner, extractCandidates } from "../packages/scanner/dist/index.js";

const RUNS = 30;

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function measure(name, unitCount, run, setup = () => {}) {
  const times = [];
  for (let i = 0; i < RUNS + 5; i++) {
    await setup();
    const start = performance.now();
    await run();
    const elapsed = performance.now() - start;
    // The first runs warm up the JIT and aren't counted.
    if (i >= 5) times.push(elapsed);
  }
  const ms = median(times);
  console.log(
    `| ${name.padEnd(48)} | ${ms.toFixed(2).padStart(9)} | ${Math.round(unitCount / (ms / 1000))
      .toLocaleString("en-US")
      .padStart(12)} |`,
  );
}

/** A realistic mix of distinct, valid expressions. */
function expressions(count) {
  const spacing = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64];
  const colors = [
    "brand",
    "dark",
    "light",
    "muted",
    "gray-100",
    "gray-500",
    "gray-900",
    "red",
    "blue",
  ];
  const prefixes = [
    "",
    "hover:",
    "focus:",
    "md:",
    "lg:",
    "md:hover:",
    "active:",
    "xl:",
    "sm:focus:",
  ];
  const makers = [
    (i) => `padding(${spacing[i % spacing.length]})`,
    (i) => `margin-x(${spacing[i % spacing.length]})`,
    (i) => `gap(${spacing[i % spacing.length]})`,
    (i) => `bg(${colors[i % colors.length]})`,
    (i) => `text-color(alpha(${colors[i % colors.length]},${i % 101}))`,
    (i) => `width[calc(100%-${i}px)]`,
    (i) => `height[${i}px]`,
    (i) => `opacity(${i % 101})`,
    (i) => `columns(${(i % 64) + 1})`,
    (i) => `z-index(${i % 9000})`,
  ];
  const seen = new Set();
  for (let i = 0; seen.size < count; i++) {
    seen.add(`${prefixes[i % prefixes.length]}${makers[i % makers.length](i)}`);
  }
  return [...seen];
}

function htmlFile(list) {
  let out = "<!doctype html>\n<main>\n";
  for (let i = 0; i < list.length; i += 8) {
    out += `  <div class="${list.slice(i, i + 8).join(" ")}">Don't mind this text ${i}</div>\n`;
  }
  return `${out}</main>\n`;
}

console.log(
  `Node ${process.version}, ${cpus()[0]?.model ?? "unknown CPU"}, median of ${RUNS} runs\n`,
);
console.log(
  `| ${"Benchmark".padEnd(48)} | ${"Time (ms)".padStart(9)} | ${"Items/second".padStart(12)} |`,
);
console.log(`| ${"-".repeat(48)} | ${"-".repeat(9)} | ${"-".repeat(12)} |`);

// Parsing
const parsed = expressions(10_000);
await measure("Parse 10,000 expressions", parsed.length, () => {
  for (const expression of parsed) parse(expression);
});

// Compilation. A new engine per run, so that the memoization cache starts cold.
for (const size of [100, 1_000, 10_000]) {
  const list = expressions(size);
  let engine;
  await measure(
    `Compile ${size.toLocaleString("en-US")} expressions (cold)`,
    size,
    () => engine.compile(list, { minify: true }),
    () => {
      engine = createCroff();
    },
  );
}

// Recompiling with one new expression, which is what a watcher does.
{
  const list = expressions(10_000);
  const engine = createCroff();
  engine.compile(list);
  let extra = 0;
  await measure("Recompile 10,000 + 1 new expression (warm)", 10_001, () =>
    engine.compile([...list, `height[${100_000 + extra++}px]`]),
  );
}

// Extraction from text in memory.
{
  const list = expressions(10_000);
  const source = htmlFile(list);
  await measure(`Extract from ${Math.round(source.length / 1024)} kB of HTML`, list.length, () =>
    extractCandidates(source),
  );
}

// Scanning real files.
const directory = mkdtempSync(join(tmpdir(), "croff-bench-"));
try {
  const fileCount = 1_000;
  const pool = expressions(5_000);
  mkdirSync(join(directory, "src"));
  for (let i = 0; i < fileCount; i++) {
    const start = (i * 13) % (pool.length - 40);
    writeFileSync(
      join(directory, "src", `file-${i}.html`),
      htmlFile(pool.slice(start, start + 40)),
    );
  }

  let scanner;
  await measure(
    `Scan ${fileCount.toLocaleString("en-US")} files (cold)`,
    fileCount,
    () => scanner.scan(),
    () => {
      scanner = new Scanner({ cwd: directory, content: ["src/**/*.html"] });
    },
  );

  const warm = new Scanner({ cwd: directory, content: ["src/**/*.html"] });
  await warm.scan();
  await measure(`Rescan ${fileCount.toLocaleString("en-US")} unchanged files`, fileCount, () =>
    warm.scan(),
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
