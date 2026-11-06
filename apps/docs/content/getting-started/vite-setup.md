---
title: Vite setup
description: Use the Vite plugin in an existing project.
---

## 1. Add the plugin

```ts
import react from "@vitejs/plugin-react";
import croff from "@croff/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), croff()],
});
```

The plugin works with any framework, or none.

## 2. Create a stylesheet

Create `src/croff.css`:

```css
@croff reset;
@croff;
```

## 3. Import it

```ts
import "./croff.css";
```

## 4. Use a utility

```html
<h1 class="text-size(4xl) text-weight(bold) color(brand)">Hello</h1>
```

Start your dev server. Utilities update as you edit, without a page reload.

## Configuration is optional

Without a config file, CROFF scans `src/**/*` and `index.html` using the default theme. Add `croff.config.ts` to customize either. See [Vite](/docs/integrations/vite) for details on how the plugin behaves.
