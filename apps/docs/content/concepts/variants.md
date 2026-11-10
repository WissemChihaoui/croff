---
title: Variants
description: Apply utilities conditionally.
---

A variant is written before a utility, followed by a colon.

```html compile
<button class="hover:bg(brand) focus:ring(2) disabled:opacity(50)">Save</button>
```

## Built-in state variants

| Variant          | Applies when                                   |
| ---------------- | ---------------------------------------------- |
| `rtl:`           | The text runs right to left.                   |
| `ltr:`           | The text runs left to right.                   |
| `group-hover:`   | An ancestor with the class `group` is hovered. |
| `first:`         | The element is its parent's first child.       |
| `last:`          | The element is its parent's last child.        |
| `hover:`         | The element is hovered.                        |
| `focus-within:`  | The element or a descendant has focus.         |
| `focus:`         | The element has focus.                         |
| `focus-visible:` | The element has keyboard-visible focus.        |
| `active:`        | The element is being pressed.                  |
| `disabled:`      | A form control is disabled.                    |

## Generated boxes

`before:` and `after:` style the `::before` and `::after` boxes. You don't need to set `content` for them to render. Add `content` only when you want text in the box, with the text quoted inside the brackets:

```html compile
<a class="before:display(block) before:height(1) after:content['→']">Next</a>
```

The pseudo-element always ends the selector, so `before:hover:` and `hover:before:` both mean "the box, while the element is hovered". An element only has one of each, so `before:after:` is the error `conflicting-variants`.

## Right-to-left languages

For Arabic, Hebrew, Persian and other right-to-left languages, set `dir="rtl"` on the page or on any part of it. Then reach for the logical utilities, which follow the text direction instead of naming a side: `padding-start`, `padding-end`, `margin-start`, `margin-end`, `inset-start`, `inset-end`, `border-start`, `border-end`, `radius-start` and `radius-end`. `text-align(start)` and `float(inline-start)` work the same way.

```html compile
<p class="padding-start(4) border-start(2,brand) text-align(start)">مرحبا</p>
```

The same markup puts the border on the left in English and on the right in Arabic. For anything that isn't a side, such as flipping an arrow icon, use `rtl:` and `ltr:`. They follow `dir` from any ancestor, including `<html>`:

```html compile
<span class="rtl:scale[-1,1]">→</span>
```

## Preference variants

These follow what the visitor's device asks for.

| Variant          | Applies when                             |
| ---------------- | ---------------------------------------- |
| `dark:`          | The system asks for a dark color scheme. |
| `motion-reduce:` | The visitor has asked for less motion.   |
| `print:`         | The page is printed.                     |

```html compile
<div
  class="bg(light) color(dark) dark:bg(dark) dark:color(light) motion-reduce:transition(none) print:display(none)"
></div>
```

To control dark mode with your own toggle, replace the variant with a plugin, and put the class `dark` on an ancestor:

```ts
import { definePlugin } from "@croffcss/core";

export default definePlugin({
  name: "croff-plugin-dark-class",
  override: true,
  variants: {
    dark: { selector: ".dark &" },
  },
});
```

## Composition

Stack variants in any order. All of them apply.

```html compile
<a class="md:hover:focus:color(brand)">Link</a>
```

Selector variants combine, and at-rule variants nest. Different orders are technically different class names, but select the same elements under the same conditions, so pick one convention.

Each utility carries its own variants. CROFF has no grouping syntax, so write `hover:bg(brand) hover:padding(4)`. `hover:(bg(brand),padding(4))` is reported as the error `unsupported-group`.

## How conflicts are decided

When two utilities on an element set the same property, the browser decides using the normal CSS rules: **specificity first, then order**. CROFF keeps native selectors, so it controls the order, but not specificity.

| Expression                          | Selector                                  | Specificity |
| ----------------------------------- | ----------------------------------------- | ----------- |
| `padding(1)`                        | `.x`                                      | 0,1,0       |
| `md:padding(1)`                     | `.x` in a media query, which adds nothing | 0,1,0       |
| `hover:padding(1)` and other states | `.x:hover`                                | 0,2,0       |
| `md:hover:padding(1)`               | `.x:hover` in a media query               | 0,2,0       |
| `hover:focus:padding(1)`            | `.x:hover:focus`                          | 0,3,0       |
| `group-hover:padding(1)`            | `.group:hover .x`                         | 0,3,0       |
| `dark:padding(1)`                   | `.x` in a media query, which adds nothing | 0,1,0       |

### What this means

- **`md:` beats an unprefixed utility**, from that width up. They have equal specificity, and `md:` comes later.
- **`hover:` beats `md:`**, at every width, because a state adds specificity and a breakpoint doesn't. Hovering `md:padding(2) hover:padding(4)` gives `padding(4)`.
- **`md:hover:` beats `hover:`**, from that width up. To change a hover style at a breakpoint, use both variants.
- **`group-hover:` beats `hover:`**, and `md:`. It has the highest specificity of any single variant, even though it comes earliest in the output. Plain `hover:` can't override it.
- **Stacked states beat single states**, wherever those sort: `hover:focus:` beats `focus-visible:`.

### Order

Where specificity is equal, the later rule wins. CROFF's order doesn't depend on where classes appear in your markup:

1. Rules without at-rules come first, then breakpoints from narrowest to widest, then other at-rules, such as `dark:`. So `dark:` beats `md:` when both apply.
2. Within those, states go in the order of the table above, so `active:` beats `focus:`, which beats `hover:`.
3. Then utilities in registry order, so `padding-top` beats `padding-x`, which beats `padding`.

## Group hover

Mark the ancestor with the plain class `group`.

```html
<a class="group flex(row) gap(2)">
  <span class="group-hover:color(brand)">Hover the whole link</span>
</a>
```

## Custom variants

Plugins can add any selector or at-rule variant. See [Creating variants](/docs/extending/creating-variants).
