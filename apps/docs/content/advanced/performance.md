---
title: Performance
description: What was measured, how, and what it does and doesn't show.
---

CROFF doesn't make claims about being faster than other tools, because no comparative benchmarks exist. This page reports what was measured on CROFF alone, so that you can judge it, and so that regressions can be spotted.

## Results

Measured on Node 22.17 on an Intel Core i5-10210U laptop running Windows 11, using version 0.1.0. Run them yourself, because your numbers will differ.

| Benchmark                                         | Median time |
| ------------------------------------------------- | ----------- |
| Parse 10,000 expressions                          | 16 ms       |
| Compile 100 expressions, cold                     | 1.9 ms      |
| Compile 1,000 expressions, cold                   | 9 ms        |
| Compile 10,000 expressions, cold                  | 130 ms      |
| Compile 1,000 variant groups, cold                | 75 ms       |
| Recompile 10,000 expressions plus 1 new one, warm | 38 ms       |
| Extract expressions from 295 kB of HTML in memory | 13 ms       |
| Scan 1,000 files, cold                            | 380 ms      |
| Rescan 1,000 unchanged files                      | 41 ms       |

These vary a lot with the state of the machine. Separate runs of this table on the same laptop differed by up to 80%, including for code that hadn't changed, so treat them as a rough guide.

## Methodology

```bash
pnpm build
pnpm bench
```

The script is `scripts/bench.mjs`. It runs against the built packages.

- Each benchmark runs 35 times. The first 5 warm up the JIT and are discarded, and the median of the other 30 is reported.
- Expressions are generated, distinct and valid, in a mix of tokens, nested functions, bracket values and stacked variants. Real projects have different mixes.
- "Cold" means a new engine with an empty cache, or a new scanner. "Warm" reuses them.
- Compile benchmarks include sorting and printing minified CSS.
- Scan benchmarks use real files in a temporary directory, so they depend on your disk and, on Windows in particular, on antivirus software.

A project with 10,000 distinct expressions is far larger than most. A few hundred to a few thousand is more typical.

## Where the design helps

- **Incremental scanning.** Files whose size and modification time are unchanged aren't read again.
- **Memoized resolution.** Parsing and resolving happen once per expression per compiler.
- **No work without change.** Integrations regenerate CSS only if the set of expressions changed.

## What isn't measured

Time through a whole Vite or PostCSS pipeline depends mostly on those tools and your project. Memory use isn't tracked yet either.
