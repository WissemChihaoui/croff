---
title: Project setup
description: Let croff init configure your project.
---

The fastest way to configure a project is the CLI:

```bash
croff init
```

## What init does

It looks at your project, then:

1. Detects your build tool, framework and whether you use TypeScript, from `package.json` and config files.
2. Creates `croff.config.ts`, or `croff.config.mjs` if you don't use TypeScript.
3. Creates a stylesheet with the `@croff` directive, at `src/croff.css` if you have a `src` directory.
4. Wires up the integration:
   - **Vite:** adds the plugin to your Vite config. If it can't confidently edit the file, it tells you what to add.
   - **PostCSS or Next.js:** creates a `postcss.config.mjs`, or tells you what to add to your existing one.
   - **Neither:** sets `input` and `output` in the config, for use with `croff dev` and `croff build`.
5. Prints the remaining steps.

`init` never overwrites a file. Run it with `--dry-run` to preview what it would do, or `--integration vite`, `postcss` or `cli` to override detection.

## What you get

```ts
import { defineConfig } from "@croffcss/core";

export default defineConfig({
  content: ["src/**/*.{html,js,jsx,ts,tsx,vue,svelte,astro,md,mdx}", "index.html"],
  theme: {
    colors: {
      // Your tokens are merged over the default theme.
      // brand: "#c8fd12",
    },
  },
});
```

```css
@croff reset;
@croff;
```

`@croff reset;` adds a small reset and is optional. `@croff;` adds your theme variables and utilities. See [Configuration file](/docs/configuration/configuration-file) for every option.
