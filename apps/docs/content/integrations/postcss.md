---
title: PostCSS
description: Use CROFF in any PostCSS pipeline.
---

```js
import croff from "@croffcss/postcss";

export default {
  plugins: [croff()],
};
```

Or, with string names:

```js
export default {
  plugins: { "@croffcss/postcss": {} },
};
```

Then use the directive in a stylesheet that PostCSS processes:

```css
@croff reset;
@croff;
```

## Options

| Option   | Default                      | Purpose                  |
| -------- | ---------------------------- | ------------------------ |
| `cwd`    | `process.cwd()`              | The project root.        |
| `config` | `croff.config.*` in the root | Path to the config file. |

## Behavior

- Each `@croff` at-rule is replaced by generated CSS, attributed to the directive's position in source maps.
- An unknown directive such as `@croff everything;` throws a CSS syntax error with its line and column.
- Invalid expressions become PostCSS warnings.
- The plugin registers `dir-dependency` and `dependency` messages, so that watch mode in the host tool rebuilds when sources or config change.
- Between runs, only files that changed on disk are read again. Editing or creating `croff.config` is picked up on the next run.

The showcase example in `examples/showcase` uses this integration through Vite's built-in PostCSS support.
