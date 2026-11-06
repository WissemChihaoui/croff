---
title: Theme tokens
description: Your design decisions, as data.
---

A theme is a set of scales, and a scale is a set of named tokens.

```ts
import { defineConfig } from "@croff/core";

export default defineConfig({
  theme: {
    colors: {
      accent: "#ff5c00",
      slate: { 100: "#f1f5f9", 900: "#0f172a" },
    },
    spacing: { 7: "1.75rem" },
  },
});
```

## Using tokens

```html compile
<div class="bg(accent) color(slate-100) padding(7)"></div>
```

Nested groups flatten with hyphens, so `slate: { 100: ... }` is `slate-100`.

## Built-in scales

| Scale            | Used by                                        | Custom property                         |
| ---------------- | ---------------------------------------------- | --------------------------------------- |
| `colors`         | `bg`, `color`, `border-color` and others       | `--croff-color-*`                       |
| `spacing`        | `padding`, `margin`, `gap`, `width` and others | `--croff-spacing-*`                     |
| `radius`         | `radius`                                       | `--croff-radius-*`                      |
| `fonts`          | `font`                                         | `--croff-font-*`                        |
| `textSizes`      | `text-size`                                    | `--croff-text-size-*`                   |
| `textWeights`    | `text-weight`                                  | `--croff-text-weight-*`                 |
| `lineHeights`    | `line-height`                                  | `--croff-line-height-*`                 |
| `letterSpacings` | `letter-spacing`                               | `--croff-letter-spacing-*`              |
| `shadows`        | `shadow`                                       | `--croff-shadow-*`                      |
| `durations`      | `duration`, `transition`                       | `--croff-duration-*`                    |
| `breakpoints`    | Responsive variants                            | None. Media queries can't read `var()`. |

## Merging

Your theme merges over the default, token by token. `null` removes a token or a whole group, and `preset: "none"` starts from nothing. See [Theme customization](/docs/configuration/theme-customization).

## Validation

Token values are checked when the config loads. `spacing: { 1: "wide" }` fails, with a message saying what was expected, and so does any value that could break out of a CSS declaration. Using a token that doesn't exist is an error with a suggestion, not a silently empty rule.

## Tokens at runtime

Tokens compile to custom properties, so you can override one in plain CSS, for a section or for a dark theme:

```css
.campaign {
  --croff-color-brand: #ff5c00;
}
```
