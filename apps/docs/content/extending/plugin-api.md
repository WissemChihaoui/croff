---
title: Plugin API reference
description: The public types and functions.
---

Plugin APIs are exported from `@croff/core`.

## Stability

Before 1.0, any release can change anything, including the language itself. Nothing below is final.

| API                                                               | Status                                                         |
| ----------------------------------------------------------------- | -------------------------------------------------------------- |
| Utility expressions and the grammar                               | Not final. Changes will be called out in the changelog.        |
| `@croff` directives, `defineConfig`, config options, CLI commands | Intended to stay. Changes will be called out in the changelog. |
| `createCroff` and its `compile` and `processCss` methods          | Intended to stay.                                              |
| `parse`, `expand`, the AST and compiled rule shapes               | Unstable, marked `@unstable` in the code.                      |
| `definePlugin`, `values`, utility and variant definitions         | Unstable, marked `@unstable` in the code.                      |
| `Project`, `Registry`                                             | Unstable, marked `@unstable` in the code.                      |

Your editor shows `@unstable` when you hover over one of these. The other `@croff/*` packages are implementation details: use them through `@croff/core`.

## definePlugin

```ts
function definePlugin(plugin: CroffPlugin): CroffPlugin;
```

## CroffPlugin

| Field        | Type                            | Purpose                                                         |
| ------------ | ------------------------------- | --------------------------------------------------------------- |
| `name`       | `string`                        | Required. A package-style name, by convention `croff-plugin-*`. |
| `apiVersion` | `number`                        | The targeted plugin API version. Defaults to the current one.   |
| `theme`      | `ThemeConfig`                   | Tokens and scales.                                              |
| `utilities`  | `Record<string, PluginUtility>` | New utilities, by name.                                         |
| `variants`   | `Record<string, PluginVariant>` | New variants, by name.                                          |
| `override`   | `boolean`                       | Allow replacing existing definitions.                           |

## PluginUtility

| Field         | Type                                    | Purpose                                                                                                  |
| ------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `description` | `string`                                | Required. Shown in generated docs.                                                                       |
| `args`        | `ArgumentSpec[]`                        | Positional arguments. Omit to disable the call form.                                                     |
| `properties`  | `string[]`                              | Properties set to the single resolved value.                                                             |
| `compile`     | `(input: UtilityInput) => Declarations` | Custom output. Use this or `properties`.                                                                 |
| `arbitrary`   | `string[]`, a function or `false`       | Properties for the bracket form, or a function from the value to declarations. Defaults to `properties`. |
| `category`    | `string`                                | Documentation category. Defaults to `"plugins"`.                                                         |
| `examples`    | `string[]`                              | Valid example expressions.                                                                               |
| `notes`       | `string`                                | Extra guidance.                                                                                          |

## PluginVariant

| Field         | Type     | Purpose                             |
| ------------- | -------- | ----------------------------------- |
| `selector`    | `string` | A selector template containing `&`. |
| `atRule`      | `string` | An at-rule, starting with `@`.      |
| `description` | `string` | Shown in generated docs.            |

## createCroff

The engine, without any file access. It's safe to use in a browser.

```ts
import { createCroff } from "@croff/core";

const croff = createCroff({ theme: { colors: { accent: "#ff5c00" } } });
const { css, rules, failures } = croff.compile(["bg(accent)", "md:gap(4)"]);
```

| Member                             | Purpose                                                                                       |
| ---------------------------------- | --------------------------------------------------------------------------------------------- |
| `compile(inputs, options)`         | Compiles expressions into CSS. Takes `minify`, `variables`, `layers`, `sourceMap` and `file`. |
| `processCss(css, inputs, options)` | Replaces `@croff` directives in a stylesheet. Takes `minify`.                                 |
| `theme`                            | The resolved theme.                                                                           |
| `registry`                         | The registry, for inspecting utilities and variants.                                          |
| `issues`                           | Theme problems, with `{ strict: false }`.                                                     |

## Project

`@croff/core/node` adds files on top of the engine. Integrations are built on this.

```ts
import { Project } from "@croff/core/node";

const project = await Project.load({ cwd: process.cwd() });
await project.scan();
const { css, diagnostics } = await project.generate({ minify: true });
```

| Member                     | Purpose                                                      |
| -------------------------- | ------------------------------------------------------------ |
| `Project.load(options)`    | Loads the config. Takes `cwd`, `configPath` and `overrides`. |
| `scan()`                   | Scans, reading only changed files.                           |
| `updateFile(path)`         | Rescans one file.                                            |
| `generate(options)`        | Compiles what's been found, with diagnostics.                |
| `processCss(css, options)` | Replaces directives, with diagnostics.                       |
| `watch(onChange, onError)` | Watches content files.                                       |
