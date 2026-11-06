---
title: Vanilla HTML example
description: No bundler, no framework.
---

`examples/vanilla` is a single HTML file and the CLI.

## Files

```ts
import { defineConfig } from "@croff/core";

export default defineConfig({
  content: ["*.html"],
  input: "croff.css",
  output: "dist/croff.css",
});
```

```css
@croff reset;
@croff;
```

```html
<!doctype html>
<html lang="en">
  <head>
    <link rel="stylesheet" href="dist/croff.css" />
  </head>
  <body class="bg(dark) color(light) font(sans)">
    <h1 class="text-size(4xl) text-weight(bold)">Style without the noise.</h1>
  </body>
</html>
```

## Run it

```bash
pnpm install
pnpm build
pnpm --filter @croff/example-vanilla build
```

Then open `index.html` in a browser. Use `pnpm --filter @croff/example-vanilla dev` to rebuild as you edit.
