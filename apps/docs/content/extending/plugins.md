---
title: Plugins
description: Add utilities, variants and tokens.
---

A plugin is an object that contributes to the registry and theme. Built-in utilities are registered through the same path.

```ts
import { defineConfig, definePlugin, values } from "@croff/core";

const typography = definePlugin({
  name: "croff-plugin-typography",
  theme: {
    fonts: { reading: "Georgia, serif" },
  },
  utilities: {
    "line-clamp": {
      description: "Truncates text after a number of lines.",
      args: [{ name: "lines", types: [values.integer({ min: 1, max: 12 })] }],
      compile: ({ args }) => ({
        display: "-webkit-box",
        "-webkit-box-orient": "vertical",
        "-webkit-line-clamp": args[0]!,
        overflow: "hidden",
      }),
    },
  },
  variants: {
    even: { selector: "&:nth-child(even)" },
  },
});

export default defineConfig({
  plugins: [typography],
});
```

```html
<p class="even:line-clamp(2)">A long paragraph.</p>
```

## Lifecycle

When CROFF starts:

1. **Validate.** Each plugin's shape, name and `apiVersion` are checked.
2. **Merge themes.** Plugin themes merge over the preset, in plugin order, and then your `theme` merges over those.
3. **Register.** Built-ins register first, then each plugin's utilities and variants, in order. Definitions are validated at this step.

A plugin has no other hooks. It describes what it adds, and CROFF does the rest.

## Rules

- A plugin can't replace a built-in or an earlier plugin's definition unless it sets `override: true`.
- Registering two plugins with the same name is an error.
- Errors name the plugin responsible.
- A utility that throws or returns unsafe CSS fails only the expression using it, with a `utility-error` or `unsafe-output` error. This protects against mistakes, but it isn't a sandbox: plugins run as code at build time, so only use ones you trust.
- Plugin utilities and variants sort after the built-ins in the cascade.

## Compatibility

`apiVersion` states the plugin API version a plugin targets. The current version is 1. CROFF refuses to load a plugin with a different one, rather than failing in a confusing way later.

Version 0.x makes no stability promise, and the plugin API may change between minor versions until 1.0.
