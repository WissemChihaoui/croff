---
title: First component
description: Build a card, one idea at a time.
---

## Start with layout

```html compile
<article class="flex(col) gap(3) padding(6)">
  <h2>Design tokens</h2>
  <p>Every value in parentheses comes from your theme.</p>
</article>
```

`flex(col)` makes a column, and `gap(3)` and `padding(6)` read from your spacing scale.

## Add surface and type

```html
<article class="flex(col) gap(3) padding(6) bg(gray-900) border(1,gray-700) radius(lg)">
  <h2 class="text-size(xl) text-weight(bold)">Design tokens</h2>
  <p class="color(gray-400) line-height(relaxed)">
    Every value in parentheses comes from your theme.
  </p>
</article>
```

## Add interaction

Variants go in front. `group-hover` reacts to the nearest ancestor with the plain class `group`.

```html
<article
  class="group flex(col) gap(3) padding(6) bg(gray-900) border(1,gray-700) radius(lg) transition(colors) hover:border-color(brand)"
>
  <h2 class="text-size(xl) text-weight(bold) transition(colors) group-hover:color(brand)">
    Design tokens
  </h2>
</article>
```

## Make it responsive

Breakpoint variants apply from that width up, so write the small layout first.

```html
<div class="display(grid) columns(1) md:columns(2) xl:columns(3) gap(4)">
  <article class="padding(6)">One</article>
  <article class="padding(6) md:grid-span(2) xl:grid-span(1)">Two</article>
</div>
```

## Break out when you need to

If a value isn't in your system, brackets make that visible.

```html
<article class="max-width[22rem] shadow[0_0_40px_#c8fd12]">Glowing</article>
```

Try all of this in the [playground](/playground).
