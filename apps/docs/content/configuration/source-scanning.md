---
title: Source scanning
description: How CROFF finds your expressions.
---

The scanner reads files as text. It doesn't parse JavaScript, doesn't run your code and doesn't care which framework you use.

## Which files

```ts
import { defineConfig } from "@croff/core";

export default defineConfig({
  content: ["src/**/*.{ts,tsx}", "templates/**/*.php"],
  ignore: ["src/**/*.test.tsx"],
});
```

Dependencies, build output and minified files are always ignored: `node_modules`, `dist`, `.git`, `.vite` and `*.min.*`.

## What counts as a candidate

A token that starts after whitespace, a quote or `=`, is shaped like an expression and ends at whitespace, a quote, `>` or the end of the text. So `el.width(10)` and `width(10);` are never picked up.

Bare words never qualify, which keeps almost all prose and code out.

## Context decides how strict it is

Where a candidate appears decides what happens if it's invalid.

| Context                   | Example                   | If invalid                                       |
| ------------------------- | ------------------------- | ------------------------------------------------ |
| Class attribute or helper | `class="gap(banana)"`     | Error                                            |
| Any other string          | `const a = "gap(banana)"` | Warning if the utility exists, otherwise ignored |
| Code                      | `run(1)`                  | Ignored                                          |

Class attributes are `class`, `className`, `:class` and `class:list`. Helpers are the functions in `classFunctions`. Add your own:

```ts
import { defineConfig } from "@croff/core";

export default defineConfig({
  classFunctions: ["cx", "tw", "styles"],
});
```

Valid expressions generate CSS in any context. A stray `width(10)` that looks like a utility in delimited code adds one small harmless rule.

## Speed

Files whose size and modification time haven't changed aren't read again, and watchers only act if the set of expressions changed. See [Performance](/docs/advanced/performance).

## Limitations

Class names built at runtime can't be found. See [Dynamic utility limitations](/docs/advanced/dynamic-utilities).
