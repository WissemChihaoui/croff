---
title: Breakpoints
description: Define your own responsive variants.
---

Each token in the `breakpoints` scale becomes a variant.

```ts
import { defineConfig } from "@croffcss/core";

export default defineConfig({
  theme: {
    breakpoints: {
      tablet: "800px",
      md: null,
    },
  },
});
```

This adds `tablet:` and removes `md:`.

## Order

Media queries are ordered by width, not by name or declaration order, so wider breakpoints always win. Units are compared at 16px to the `rem` or `em`.

## Units

Breakpoint values can be `px`, `em` or `rem`. They're written directly into media queries, because `var()` doesn't work there, which is also why breakpoints have no custom properties.

## Naming

Names follow the rules for variants: lowercase letters, digits and hyphens. A breakpoint can't share a name with a state variant such as `hover`.
