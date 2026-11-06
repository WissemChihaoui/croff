# CROFF architecture

This is the engineering overview. The user-facing version lives in the
documentation site. Decisions and their rationale are recorded in
[`docs/adr`](./adr).

## Pipeline

```text
 source files ──► scanner ──► candidates ──┐
                                           ▼
 croff.config ──► core ──► theme + registry ──► compiler ──► CSS + diagnostics
                    ▲                             │
                 plugins                          ├─ parser  (syntax → AST)
                                                  └─ registry (AST → declarations)
```

Each stage is a pure function of its inputs apart from the scanner's file
access. Parsing, validation and CSS generation are separate.

## Packages

| Package             | Responsibility                                                         | Depends on              |
| ------------------- | ---------------------------------------------------------------------- | ----------------------- |
| `@croff/parser`     | Tokenizer, parser, AST. No knowledge of utilities or themes.           | —                       |
| `@croff/theme`      | Token scales, merging, validation, CSS variables, default theme.       | —                       |
| `@croff/registry`   | Utility and variant definitions; AST → CSS declarations.               | parser (types), theme   |
| `@croff/compiler`   | Resolution cache, ordering, selectors, printing, source maps.          | parser, theme, registry |
| `@croff/scanner`    | Candidate extraction (browser-safe) and file scanning/watching.        | tinyglobby, picomatch   |
| `@croff/plugin-api` | Plugin types, validation, application.                                 | theme, registry         |
| `@croff/core`       | Public API (`createCroff`), plus `@croff/core/node` (config, project). | everything above, jiti  |
| `@croff/cli`        | `croff init / dev / build / check`.                                    | core, scanner           |
| `@croff/vite`       | Vite plugin.                                                           | core                    |
| `@croff/postcss`    | PostCSS plugin.                                                        | core                    |

The dependency graph is acyclic and is enforced by TypeScript project
references. Everything reachable from `@croff/core` (not `/node`) and from
`@croff/scanner/extract` is browser-safe; the playground imports exactly those
entry points.

## Output model

Each expression compiles to one atomic rule whose selector is that expression,
escaped:

```css
.md\:hover\:bg\(brand-dark\) { … }
```

No source rewriting happens. What you read in DevTools is what you wrote. See
[ADR 0002](./adr/0002-atomic-escaped-selectors.md).

A [variant group](./adr/0008-variant-groups.md) is one class that stands for several
expressions. The compiler expands it straight after parsing, and each member is compiled
as an ordinary expression. Each resulting rule selects every class that contains it, so a
group shares rules, ordering and cascade with the written-out form.

## Deterministic ordering

Output order is a total order computed only from the rules themselves, so the
order in which files are scanned can never change the output:

1. Theme variables, in scale then token order.
2. Rules without at-rules, then at-rule blocks (breakpoints ascending by width,
   then other at-rules).
3. Within a group: variant order, then utility registry order, then the
   expression's code-unit order.

Utility registry order is the cascade contract: general utilities are declared
before specific ones (`padding` before `padding-x` before `padding-top`), so
specific utilities win.

## Incrementality

- The scanner caches per-file candidates keyed on `mtime` + `size`.
- The compiler memoizes each expression's resolved rule for the life of the
  compiler instance (a new theme or plugin set means a new instance).
- Integrations only regenerate CSS if the candidate _set_ changed.

## Repository layout

```text
apps/docs        Documentation site + playground (Vite, React, prerendered)
packages/*       The framework
examples/*       Vanilla (CLI), React (Vite plugin), Showcase (PostCSS)
tests/           Cross-package integration tests
scripts/         Benchmarks and maintenance
docs/            Engineering docs: grammar, architecture, ADRs
```
