---
title: Custom spacing
description: Set the rhythm of your layouts.
---

The spacing scale drives `padding`, `margin`, `gap`, `width`, `height`, `inset` and `basis`, among others.

```ts
import { defineConfig } from "@croffcss/core";

export default defineConfig({
  theme: {
    spacing: {
      7: "1.75rem",
      gutter: "clamp(1rem, 4vw, 3rem)",
    },
  },
});
```

```html
<section class="padding-x(gutter) gap(7)">Content</section>
```

Token names don't need to be numbers. They can't contain dots, so name half-steps something like `1_5`.

## Default scale

`0`, `px`, `1`, `2`, `3`, `4`, `5`, `6`, `8`, `10`, `12`, `16`, `20`, `24`, `32`, `40`, `48` and `64`, where `1` is `0.25rem`.

The scale has gaps on purpose: `gap(7)` is an error until you define it.

## Negative values

`margin` and the offset utilities accept a minus sign.

```html compile
<div class="margin-top(-4) top(-2)"></div>
```

`padding` doesn't, since CSS doesn't allow negative padding.
