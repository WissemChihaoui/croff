# ADR 0001: ESM-only packages and a small toolchain

**Status:** accepted

**Decision.** All packages are ESM-only and require Node 22.12+. Packages are compiled with plain `tsc -b` using project references, not a bundler. Builds are ordered by TypeScript references; Turborepo is not used.

**Why.**

- Node 22.12+ can `require()` ESM without a flag, Vite and PostCSS both load ESM, and dual publishing is a known source of bugs.
- `tsc -b` gives us declarations and an enforced acyclic dependency graph with no extra tooling. The whole package build is a few seconds, so a task cache would add a dependency without a meaningful payoff. This is easy to revisit.
- Node 22.12 is the minimum because that's the oldest version our test runner supports, so it's the oldest we can verify. Node 20 reached end of life in April 2026.
- TypeScript is pinned to 6.0.x because typescript-eslint does not yet support 7.x.
