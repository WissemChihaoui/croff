---
title: Arbitrary values
description: Use raw CSS when the design system doesn't have the answer.
---

Brackets hold raw CSS, for values outside your tokens.

```html compile
<div class="width[320px] height[calc(100vh-80px)] bg[#121212]"></div>
```

Most utilities accept this form. A few, such as `flex`, don't, because their value isn't a single CSS value. The [utility reference](/docs/utilities/layout) shows which forms each one supports.

## Spaces

An underscore is a space.

```html compile
<div class="margin[0_auto] grid-span[1_/_3]"></div>
```

Write `\_` for a literal underscore. Underscores in `url(...)` are left alone, so `bg-image[url(/my_photo.png)]` works as you'd expect.

## Math

CSS requires spaces around `+` and `-` in math functions, and class names can't contain spaces, so CROFF adds them inside `calc()`, `min()`, `max()` and `clamp()`.

```html compile
<div class="width[calc(100%-var(--sidebar-width))]"></div>
```

Hyphens in custom property names and identifiers are left alone.

## Nesting and quotes

Parentheses, brackets, commas and quotes all work, as long as they balance.

```html
<p class="font['Inter',sans-serif] columns[[full-start]_1fr_[full-end]]">Text</p>
```

## Safety

A bracket value can't affect anything outside its own declaration. CROFF rejects `{`, `}`, `/*` and `</` outside a string, `;` outside a function, and unbalanced brackets or quotes:

```text
width[1px;color:red]
The bracket value "1px;color:red" could break the rest of the stylesheet. It can't contain
"{", "}", "/*" or "</" outside a string, or ";" outside a function, and its brackets and
quotes must balance.
```

Semicolons inside a function are fine, so data URIs work: `bg-image[url(data:image/png;base64,...)]`.

## When to use them

Reach for a token first, and add one if the value recurs. A bracket value marks a deliberate exception, and the syntax makes those easy to find in review.
