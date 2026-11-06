---
title: Theme customization
description: Add, change and remove tokens.
---

## Add and change

Tokens merge over the defaults, one at a time.

```ts
import { defineConfig } from "@croff/core";

export default defineConfig({
  theme: {
    colors: {
      accent: "#ff5c00",
      brand: "#8b5cf6",
    },
  },
});
```

`accent` is new, `brand` changes, and everything else stays.

## Remove

`null` removes a token or a whole group.

```ts
import { defineConfig } from "@croff/core";

export default defineConfig({
  theme: {
    colors: { red: null, gray: null },
    shadows: null,
  },
});
```

Now `bg(red)` is an error, which is how you enforce a smaller palette.

## Mistakes that are rejected

These mistakes stop the build, with a message saying what to change:

| Mistake                                     | Example                                           | Code                  |
| ------------------------------------------- | ------------------------------------------------- | --------------------- |
| A scale that isn't an object                | `colors: "red"`                                   | `invalid-scale-value` |
| A token named after a keyword               | `spacing: { full: "1px" }` replaces `width(full)` | `reserved-token`      |
| A breakpoint named after a state variant    | `breakpoints: { hover: "500px" }`                 | `reserved-token`      |
| A breakpoint name that can't be a variant   | `breakpoints: { Tablet: "500px" }`                | `invalid-token-name`  |
| One token written twice in the same theme   | `{ "a-b": "red", a: { b: "blue" } }`              | `token-collision`     |
| Two scales that produce one custom property | `textSize` and `textSizes`                        | `token-collision`     |

Replacing a token from an earlier layer is fine, however it's written. That's how overrides work.

## Start from nothing

```ts
import { defineConfig } from "@croff/core";

export default defineConfig({
  preset: "none",
  theme: {
    colors: { ink: "#111111", paper: "#fafafa" },
    spacing: { 1: "4px", 2: "8px" },
  },
});
```

With an empty preset, responsive variants exist only for the breakpoints you define.

## Precedence

From lowest to highest: the preset, then plugin themes in order, then your `theme`.

## Custom scales

Any other key defines a new scale, which custom utilities can read. See [Extending the theme](/docs/extending/extending-the-theme).

## Validation

| Scale                            | Must be                                          |
| -------------------------------- | ------------------------------------------------ |
| `colors`                         | A hex color, a color function or a named color.  |
| `spacing`, `radius`, `textSizes` | A length, `0` or a CSS function.                 |
| `letterSpacings`                 | A length, a CSS function or `normal`.            |
| `lineHeights`                    | A number, a length or `normal`.                  |
| `textWeights`                    | A number, `normal` or `bold`.                    |
| `breakpoints`                    | A width in `px`, `em` or `rem`.                  |
| `durations`                      | A time such as `200ms`.                          |
| Other scales                     | Any value that can't break out of a declaration. |

Token names can contain letters, digits, `-` and `_`.
