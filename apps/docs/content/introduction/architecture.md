---
title: Architecture
description: How the packages fit together.
---

CROFF is a pipeline of small packages, each independently tested.

```text
 source files ──► scanner ──► candidates ──┐
                                           ▼
 croff.config ──► core ──► theme + registry ──► compiler ──► CSS + diagnostics
                    ▲                             │
                 plugins                          ├─ parser   (syntax → AST)
                                                  └─ registry (AST → declarations)
```

## Packages

| Package             | Responsibility                                                          |
| ------------------- | ----------------------------------------------------------------------- |
| `@croff/parser`     | Tokenizer, parser and AST. Knows nothing about utilities or themes.     |
| `@croff/theme`      | Token scales, merging, validation, CSS variables and the default theme. |
| `@croff/registry`   | Utility and variant definitions, and turning an AST into declarations.  |
| `@croff/compiler`   | Caching, ordering, selectors, printing and source maps.                 |
| `@croff/scanner`    | Finding expressions in text, and scanning and watching files.           |
| `@croff/plugin-api` | The plugin interface and its validation.                                |
| `@croff/core`       | The public API. `@croff/core/node` adds config loading and projects.    |
| `@croff/cli`        | The `croff` command.                                                    |
| `@croff/vite`       | The Vite plugin.                                                        |
| `@croff/postcss`    | The PostCSS plugin.                                                     |

Most projects only touch `@croff/core` and one integration.

## Browser-safe by construction

`@croff/core` and `@croff/scanner/extract` have no Node dependencies. The [playground](/playground) imports exactly those two entry points, so it runs the same compiler as your build.

## Separation of stages

Parsing doesn't depend on configuration: `gap(4` is a syntax error under any theme. Resolution checks names and values. Printing only sees finished rules. See [Compiler architecture](/docs/advanced/compiler-architecture) for a closer look.
