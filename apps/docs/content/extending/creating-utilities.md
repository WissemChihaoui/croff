---
title: Creating utilities
description: Define a utility and its accepted values.
---

## The simple form

Use `properties` when one value goes into one or more CSS properties.

```ts
import { definePlugin, values } from "@croff/core";

export default definePlugin({
  name: "croff-plugin-tabs",
  utilities: {
    "tab-size": {
      description: "Sets the width of tab characters.",
      args: [{ name: "size", types: [values.integer({ min: 1, max: 16 })] }],
      properties: ["tab-size"],
      examples: ["tab-size(4)", "tab-size[2ch]"],
    },
  },
});
```

The bracket form is available automatically. Set `arbitrary: false` to turn it off, or to a function when the value needs wrapping, as in `arbitrary: (value) => ({ transform: `scale(${value})` })`.

## The compile form

Use `compile` when output depends on the arguments.

```ts
import { definePlugin, values } from "@croff/core";

export default definePlugin({
  name: "croff-plugin-stack",
  utilities: {
    stack: {
      description: "A flex column with a gap.",
      args: [{ name: "gap", types: values.spacing(), optional: true }],
      compile: ({ args }) => ({
        display: "flex",
        "flex-direction": "column",
        ...(args[0] ? { gap: args[0] } : {}),
      }),
    },
  },
});
```

`compile` receives the resolved `args`, the source text in `words`, and the resolve `context` for reading the theme.

## Value types

Value types live in `values` and decide what's valid. Try several in order by listing them in `types`.

| Type                                   | Accepts                                                        |
| -------------------------------------- | -------------------------------------------------------------- |
| `values.token(scale)`                  | A token from a scale. Pass `{ negative: true }` to allow `-4`. |
| `values.keywords(map)`                 | Words mapped to CSS values.                                    |
| `values.words(...list)`                | Words that are the same in CSS.                                |
| `values.integer({ min, max, format })` | Whole numbers in a range, optionally transformed.              |
| `values.fraction()`                    | `1/3`, as a percentage.                                        |
| `values.ratio()`                       | `16/9`.                                                        |
| `values.cssVar()`                      | `var(--name)`.                                                 |
| `values.color()`                       | Array: color tokens, keywords, `var()` and `alpha()`.          |
| `values.spacing(options)`              | Array: spacing tokens and `var()`.                             |
| `values.size(axis)`                    | Array: spacing tokens, fractions and size keywords.            |
| `values.offset()`                      | Array: negative spacing, fractions, `auto` and `full`.         |

## Arguments

| Field      | Purpose                                               |
| ---------- | ----------------------------------------------------- |
| `name`     | Used in error messages and generated docs.            |
| `types`    | Value types, tried in order.                          |
| `optional` | Can be left out. Optional arguments must come last.   |
| `variadic` | Accepts many values. Only valid on the last argument. |
