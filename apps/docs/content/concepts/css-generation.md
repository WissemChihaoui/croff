---
title: CSS generation
description: What the compiler produces, and why.
---

## One expression, one rule

```html compile
<div class="md:hover:bg(brand)"></div>
```

The selector is the expression itself, escaped. (A [variant group](/docs/concepts/variant-groups) is the exception, since one class stands for several rules.) Your markup isn't rewritten, and no hashes are involved, so DevTools shows what you wrote and any tool that renders a `class` attribute works.

## Only what you use

Rules are generated from expressions found in your source. Nothing else is. The same goes for theme variables.

## Order

Rules are sorted by a fixed scheme, independent of where expressions appear:

1. Theme variables, by scale and then token order.
2. Rules without at-rules, then breakpoints narrowest first, then other at-rules. Rules that share an at-rule share a block.
3. State variants, then utility registry order, then the expression's text.

Two builds of the same source are byte-identical, and tests hold the compiler to this by shuffling its input.

## Escaping

Selectors follow the `CSS.escape` algorithm, including the unusual cases: `2xl:` starts with a digit, so it becomes `.\32 xl\:...`.

## The directive

`@croff;` expands to theme variables and utilities. You can place each part separately:

| Directive           | Output                                         |
| ------------------- | ---------------------------------------------- |
| `@croff;`           | Theme variables, then utilities.               |
| `@croff reset;`     | A small reset, which isn't included otherwise. |
| `@croff theme;`     | Theme variables only.                          |
| `@croff utilities;` | Utilities only.                                |

## Minification

Generated CSS is printed compactly when minifying, instead of being post-processed. The CLI also strips comments and whitespace from your own CSS around the directive, and with Vite your bundler's minifier handles it.

## Source maps

`croff build --sourcemap` maps each rule to the first place its expression is used, so that your browser can take you from a rule to the markup that needs it. See [Debugging](/docs/advanced/debugging).
