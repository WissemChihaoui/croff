---
title: CSS variables
description: How tokens reach the browser.
---

Tokens compile to custom properties on `:root`.

```html compile
<div class="bg(brand) padding(4)"></div>
```

## Naming

`--croff-<scale>-<token>`, with these scale prefixes:

| Scale            | Prefix           |
| ---------------- | ---------------- |
| `colors`         | `color`          |
| `spacing`        | `spacing`        |
| `radius`         | `radius`         |
| `fonts`          | `font`           |
| `textSizes`      | `text-size`      |
| `textWeights`    | `text-weight`    |
| `lineHeights`    | `line-height`    |
| `letterSpacings` | `letter-spacing` |
| `shadows`        | `shadow`         |
| `durations`      | `duration`       |

Custom scales use their name in kebab case.

## Which variables are emitted

The `variables` option controls this.

| Value    | Emits                                                    |
| -------- | -------------------------------------------------------- |
| `"used"` | Only tokens used by compiled rules. This is the default. |
| `"all"`  | Every token, for referring to them from your own CSS.    |
| `"none"` | None, for when you provide them yourself.                |

## Overriding at runtime

Custom properties cascade, so tokens can change by scope without rebuilding:

```css
@media (prefers-color-scheme: light) {
  :root {
    --croff-color-dark: #ffffff;
  }
}

.campaign {
  --croff-color-brand: #ff5c00;
}
```
