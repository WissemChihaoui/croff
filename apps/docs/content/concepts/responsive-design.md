---
title: Responsive design
description: Mobile-first breakpoints, from your theme.
---

Breakpoint variants come from your theme's `breakpoints` scale, and apply from that width up.

```html compile
<div class="width(full) md:width(1/2) lg:width(1/3)"></div>
```

## Default breakpoints

| Variant | Minimum width |
| ------- | ------------- |
| `sm:`   | 640px         |
| `md:`   | 768px         |
| `lg:`   | 1024px        |
| `xl:`   | 1280px        |
| `2xl:`  | 1536px        |

## Work mobile-first

An unprefixed utility applies at every width. Add variants for where larger screens differ.

```html
<div class="flex(col) md:flex-direction(row) gap(4) md:gap(8)">
  <aside class="width(full) md:width(1/4)">Sidebar</aside>
  <main class="grow(1)">Content</main>
</div>
```

Note `md:flex-direction(row)`. `flex(col)` sets both `display` and `flex-direction`, so a breakpoint only needs to change the direction.

## Hiding and showing

```html
<nav class="display(none) md:display(block)">Desktop</nav>
<button class="md:display(none)">Menu</button>
```

## Combining with states

```html
<a class="text-size(sm) md:text-size(md) md:hover:color(brand)">Link</a>
```

## Custom breakpoints

Breakpoints are tokens, so you can add, rename or remove them. Each one becomes a variant. See [Breakpoints](/docs/configuration/breakpoints).
