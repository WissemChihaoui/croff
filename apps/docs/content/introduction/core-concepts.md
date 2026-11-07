---
title: Core concepts
description: The whole model of CROFF, in five minutes.
---

## Expressions

An expression is one token in a `class` attribute. It's a utility name followed by a value, optionally preceded by variants.

```text
md:hover:bg(brand-dark)
```

Here `md` and `hover` are variants, `bg` is the utility and `brand-dark` is the argument.

## Two value forms

```html compile
<div class="gap(4) margin[0_auto]"></div>
```

Parentheses take validated values: theme tokens, keywords, bounded numbers and registered functions. Brackets take raw CSS, with underscores standing in for spaces.

## Tokens

Your design decisions live in a theme. A token compiles to a custom property, and only the tokens you use reach the output.

```ts
import { defineConfig } from "@croffcss/core";

export default defineConfig({
  theme: {
    colors: { accent: "#ff5c00" },
  },
});
```

Now `bg(accent)` works, and `bg(acent)` is an error that suggests the fix.

## Variants

Variants apply a utility conditionally. Stack as many as you need.

```html compile
<a class="hover:color(brand) md:text-size(lg) md:hover:color(light)">Link</a>
```

## Scanning

CROFF reads your source files as text and finds what looks like an expression. It never runs your code, so class names must appear complete in the source. See [Dynamic utility limitations](/docs/advanced/dynamic-utilities).

## The directive

Generated CSS goes wherever your stylesheet says `@croff;`.

```css
@croff reset;
@croff;

.my-own-class {
  color: red;
}
```

That's the whole model. The rest of the documentation is detail.
