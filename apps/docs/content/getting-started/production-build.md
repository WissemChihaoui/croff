---
title: Production build
description: What happens when you ship.
---

## With Vite or PostCSS

Nothing extra is needed. `vite build` runs the plugin, and Vite's own CSS minifier handles the result.

## With the CLI

```bash
croff build
```

This scans your content files, generates minified CSS and writes it to `output`. It fails, and writes nothing, if any expression in a class attribute is invalid, so it's safe to run in CI.

```bash
croff check --strict
```

`croff check` validates without writing anything. With `--strict`, warnings such as runtime-built class names also fail it.

## What ends up in the file

- Only the utilities found in your source.
- Only the theme variables those utilities use.
- Rules in a fixed order, so the same source produces the same bytes.

Unused utilities aren't removed from a large stylesheet, because they're never generated. See [Build optimization](/docs/advanced/build-optimization).
