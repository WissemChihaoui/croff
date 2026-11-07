---
title: Debugging
description: Find out why a style does or doesn't apply.
---

## Start with croff check

```bash
croff check
```

It reports everything CROFF can tell is wrong, with positions. `--json` gives you the same report for tools.

## DevTools

Because selectors are your class names, DevTools shows you exactly what you wrote. If a class is on an element but has no rule, it was invalid, or wasn't scanned.

## Read the generated CSS

```bash
croff build --output out.css --no-minify
```

Rules are in a predictable order, so a problem is easy to find.

## Source maps

```bash
croff build --output out.css --sourcemap
```

This writes `out.css.map`, which maps each rule to the first place its expression is used in your source. Browsers show that location in the styles panel.

With `--input`, your own CSS around the directive isn't mapped, only the generated rules. Vite and PostCSS have their own source map handling.

## Try it alone

Paste a snippet into the [playground](/playground), which runs the same compiler and lists problems as you type.

## Inspect programmatically

```ts
import { createCroff, parse } from "@croffcss/core";

console.log(parse("md:gap(4)"));

const { rules, failures } = createCroff().compile(["md:gap(4)", "gap(banana)"]);
console.log(rules, failures);
```
