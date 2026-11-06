---
title: Variant groups
description: Write a variant once, and apply it to several utilities.
---

A group applies its variants to every utility inside it.

```html compile
<button class="hover:(bg(brand),padding(4))">Save</button>
```

That's the same as writing `hover:bg(brand) hover:padding(4)`, with the same declarations in the same place in the stylesheet.

## Syntax

Put parentheses after the variants, and separate the utilities with commas.

```text
md:(width(1/2),padding(6),gap(4),flex(row))
md:hover:(bg(brand),color(white),scale(105))
```

## Nesting

Members inherit the variants of every group around them, outermost first, and add their own.

```text
sm:(padding(4),hover:(bg(brand),color(white)))
```

This expands to:

```text
sm:padding(4)
sm:hover:bg(brand)
sm:hover:color(white)
```

A member doesn't need its own group to add a variant, so `md:(gap(4),hover:gap(8))` is fine.

## What can go inside

Anything that's valid on its own: tokens, nested functions and bracket values with their own commas and parentheses.

```html compile
<div class="lg:(width[calc(100%-2rem)],bg(alpha(brand,50)))"></div>
```

## No whitespace

Browsers split `class` on whitespace, so a group has to stay in one piece. `hover:(gap(4), gap(8))` is an error, and so is a group spread over several lines. Separate members with a comma alone.

## Generated CSS

CROFF doesn't rewrite your markup, so the browser sees the whole group as one class name. Each member's rule selects that class:

```html compile
<div class="md:(gap(4),hover:bg(brand))"></div>
```

Everything else about the rule is what you'd get by writing the expression out: its declarations, its media query and its position in the cascade. Member order inside a group doesn't matter, so in `hover:(padding-top(8),padding(1))`, `padding-top` still wins, as it always does.

If the same expression is also used elsewhere, the two share a single rule:

```html compile
<a class="hover:gap(4)"></a> <a class="hover:(gap(4),padding(2))"></a>
```

## Size

Because a group's selector contains the whole group, a group with many members repeats that long name once per member. Text like that compresses very well, but uncompressed it's larger than the written-out form. Groups are for readability: a short group gains the most.

## Errors

A group can fail in [two different ways](/docs/concepts/parsing#two-kinds-of-error).

### Syntax errors reject the whole group

If the group itself is malformed, CROFF can't tell what it contains, so no CSS is generated from it.

| Code                    | Example                  |
| ----------------------- | ------------------------ |
| `empty-group`           | `hover:()`               |
| `empty-group-member`    | `hover:(gap(4),)`        |
| `unterminated-group`    | `hover:(gap(4)`          |
| `group-without-variant` | `(gap(4),gap(8))`        |
| `duplicate-variant`     | `hover:(hover:gap(4))`   |
| `whitespace`            | `hover:(gap(4), gap(8))` |

### Resolution errors reject only that member

If the group is well-formed but a member doesn't mean anything, the other members still compile, just as they would if you'd written them separately. In `md:(gap(4),pad(4))`, `gap(4)` compiles, and the error points to `pad(4)` at its exact position:

```text
src/card.html:1:22: error unknown-utility: Unknown utility "pad".
  hint: Did you mean "padding"?
```

An unknown variant is a resolution error too, so `hovr:(gap(4),gap(8))` reports one error for each member.

## In the API

`parse` returns a node of type `group`, and `expand` flattens it into ordinary expressions, each with its position:

```ts
import { expand, parse } from "@croff/core";

const result = parse("sm:(padding(4),hover:bg(brand))");
if (result.ok) {
  console.log(expand(result.node).map((item) => item.expression));
  // ["sm:padding(4)", "sm:hover:bg(brand)"]
}
```

Try the preset in the [playground](/playground).
