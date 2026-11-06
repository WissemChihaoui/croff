---
title: Creating variants
description: Add selector and at-rule conditions.
---

A variant has a selector template, an at-rule, or both.

```ts
import { definePlugin } from "@croff/core";

export default definePlugin({
  name: "croff-plugin-variants",
  variants: {
    even: { selector: "&:nth-child(even)" },
    "not-last": { selector: "&:not(:last-child)" },
    checked: { selector: "&:checked" },
    landscape: { atRule: "@media (orientation: landscape)" },
    motion: { atRule: "@media (prefers-reduced-motion: no-preference)" },
    "parent-open": { selector: ".open &" },
  },
});
```

```html
<li class="not-last:border-bottom(1,gray-800) dark:hover:bg(gray-900)">Item</li>
```

## Selector templates

`&` stands for the utility's escaped class selector, and is required.

## At-rules

Must start with `@`. Stacked at-rules nest in the order written.

## Validation

Names follow the same rules as built-in variants, and definitions can't contain `{`, `}`, `;`, a comment or an unclosed bracket or string. In a selector list, every part needs its own `&`, so `&:hover, &:focus` is fine, but `&:hover, .other` is an error, because it would style elements without the utility's class. A clash with an existing variant is an error unless the plugin sets `override: true`.

## Ordering

Plugin variants sort after the built-ins, in registration order. At-rule variants come after all breakpoints.
