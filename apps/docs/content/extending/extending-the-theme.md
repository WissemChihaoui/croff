---
title: Extending the theme
description: Contribute tokens and new scales.
---

## Tokens in existing scales

```ts
import { definePlugin } from "@croffcss/core";

export default definePlugin({
  name: "croff-plugin-brand",
  theme: {
    colors: { "acme-red": "#d6001c" },
    spacing: { gutter: "2.5rem" },
  },
});
```

Those tokens work in every utility that reads the scale. Users can still override them, because their `theme` merges last.

## New scales

Any other key creates a scale, and a utility can read it with `values.token`.

```ts
import { definePlugin, values } from "@croffcss/core";

export default definePlugin({
  name: "croff-plugin-gradients",
  theme: {
    gradients: {
      sunrise: "linear-gradient(90deg, #ff5c00, #ffcc00)",
    },
  },
  utilities: {
    gradient: {
      description: "Applies a gradient token.",
      args: [{ name: "name", types: [values.token("gradients")] }],
      properties: ["background-image"],
    },
  },
});
```

`gradient(sunrise)` compiles to `var(--croff-gradients-sunrise)`, and the custom property is emitted only if it's used.

Scale names are camelCase, and become kebab case in custom properties.
