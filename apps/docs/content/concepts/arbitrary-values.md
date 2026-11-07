---
title: Arbitrary values
description: Use raw CSS when the design system doesn't have the answer.
---

Brackets hold raw CSS, for values outside your tokens.

```html compile
<div class="width[320px] height[calc(100vh-80px)] bg[#121212]"></div>
```

Most utilities accept this form. A few, such as `flex`, don't, because their value isn't a single CSS value. The [utility reference](/docs/utilities/layout) shows which forms each one supports.

## Any CSS property

When there's no utility for a property, put the property inside the brackets as well.

```html compile
<div
  class="[break-inside:avoid] md:hover:[text-underline-position:under] [--sidebar-width:16rem]"
></div>
```

This takes variants and follows the same rules as any bracket value, including everything below. It sorts after all utilities, so it wins when both set the same property with equal specificity. CROFF doesn't check the property name against a list of real properties, so a typo reaches the stylesheet and the browser ignores it.

The scanner only reads this form in class attributes, class helpers and strings. In plain code, `[key:string]` means something else. A string is only recognized on the line where it opens, so in a template literal spanning several lines, use a class helper such as `cx`.

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

Reach for a utility and a token first, and add a token if the value recurs. A bracket marks a deliberate exception, and the syntax makes those easy to find in review.
