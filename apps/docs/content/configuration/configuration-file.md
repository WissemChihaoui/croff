---
title: Configuration file
description: Every option in croff.config.
---

CROFF looks for `croff.config.ts`, `.mts`, `.js` or `.mjs` in the project root. The file is optional.

```ts
import { defineConfig } from "@croffcss/core";

export default defineConfig({
  content: ["src/**/*.{ts,tsx}", "index.html"],
  theme: {
    colors: { accent: "#ff5c00" },
  },
});
```

## Options

| Option           | Type                          | Default                                               | Purpose                                    |
| ---------------- | ----------------------------- | ----------------------------------------------------- | ------------------------------------------ |
| `content`        | `string[]`                    | See below                                             | Glob patterns of files to scan.            |
| `ignore`         | `string[]`                    | None                                                  | Extra patterns to exclude.                 |
| `classFunctions` | `string[]`                    | `cx`, `clsx`, `classnames`, `classNames`, `cn`, `cva` | Functions whose arguments are class names. |
| `theme`          | `ThemeConfig`                 | None                                                  | Tokens merged over the preset.             |
| `preset`         | `"default"` or `"none"`       | `"default"`                                           | The theme to start from.                   |
| `plugins`        | `CroffPlugin[]`               | None                                                  | Plugins, applied in order.                 |
| `variables`      | `"used"`, `"all"` or `"none"` | `"used"`                                              | Which theme variables to emit.             |
| `input`          | `string`                      | None                                                  | Stylesheet with `@croff`, for the CLI.     |
| `output`         | `string`                      | None                                                  | Where the CLI writes CSS.                  |

## Default content patterns

```ts
["src/**/*.{html,js,jsx,ts,tsx,mjs,cjs,vue,svelte,astro,md,mdx}", "index.html"];
```

## Paths

Paths and patterns are relative to the project root, which is the working directory for the CLI and PostCSS, and Vite's `root` for the plugin.

## Using another file

```bash
croff build --config config/croff.config.ts
```

```ts
croff({ config: "config/croff.config.ts" });
```

## Validation

`croff check` validates the config and theme, then every expression in your content files.
