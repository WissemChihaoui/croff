---
title: Philosophy
description: The ideas that decide what CROFF does and doesn't do.
---

## Explicit over magical

A value in parentheses comes from your design system. A value in brackets doesn't. That one rule means you can tell at a glance, in any file, which styles are on-system.

A bare word is never a utility, either. `flex` is a class name that belongs to you, and `flex()` is a CROFF utility. CROFF can't collide with your own classes.

## One name for one concept

Aliases are avoided. It's `padding`, never also `pad` or `p`. There are two deliberate shortcuts for very common things, `color` for `text-color` and `scale` for a scaling `transform`, and no others. Names spell out what they do, and most match the CSS property. You type a little more and read a lot less.

When you do reach for a name that doesn't exist, the error tells you the right one:

```text
Unknown utility "pad".
  hint: Did you mean "padding"?
```

## Errors are part of the product

Silently generating nothing is the worst way for a CSS tool to fail, because the only symptom is that something looks slightly wrong. CROFF reports unknown utilities, invalid values and expressions it can't see, with the file and position.

## Predictable before clever

The output is a pure function of the set of expressions in your source. Rule order follows fixed rules you can look up, so specific utilities always beat general ones, and later states always beat earlier ones.

## Zero runtime

CROFF does its work at build time. No script ships to your users, and there's nothing to hydrate. The compiler can run in a browser, and the [playground](/playground) does, but that's for learning, not production.

## A small surface

Every package has one job, and the public API is deliberately small. Features that aren't ready are on the [roadmap](/docs/introduction/roadmap), not half-built in a release.
