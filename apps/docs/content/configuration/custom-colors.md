---
title: Custom colors
description: Build a palette.
---

```ts
import { defineConfig } from "@croffcss/core";

export default defineConfig({
  theme: {
    colors: {
      accent: "#ff5c00",
      surface: "oklch(20% 0.01 90)",
      slate: { 100: "#f1f5f9", 500: "#64748b", 900: "#0f172a" },
    },
  },
});
```

```html
<div class="bg(surface) color(slate-100) border(1,slate-500) hover:bg(accent)">Card</div>
```

## Opacity

`alpha(color,percent)` works wherever a color does, and with any color token.

```html compile
<div class="bg(alpha(accent,20)) border(1,alpha(brand,50))"></div>
```

It compiles to `color-mix()`. See [Browser support](/docs/introduction/browser-support).

## Keywords

Color utilities also accept `transparent`, `current` and `inherit`.

## Custom properties of your own

```html compile
<div class="bg(var(--my-color))"></div>
```
