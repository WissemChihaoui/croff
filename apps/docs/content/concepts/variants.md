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
| `group-hover:`   | An ancestor with the class `group` is hovered. |
| `hover:`         | The element is hovered.                        |
| `focus-within:`  | The element or a descendant has focus.         |
| `focus:`         | The element has focus.                         |
| `focus-visible:` | The element has keyboard-visible focus.        |
| `active:`        | The element is being pressed.                  |
| `disabled:`      | A form control is disabled.                    |

## Composition

Stack variants in any order. All of them apply.

```html compile
<a class="md:hover:focus:color(brand)">Link</a>
```

Selector variants combine, and at-rule variants nest. Different orders are technically different class names, but select the same elements under the same conditions, so pick one convention.

To apply the same variants to several utilities, use a [variant group](/docs/concepts/variant-groups): `md:hover:(bg(brand),padding(4))`.

## Cascade order

CROFF sorts rules so that the usual expectations hold, whatever order they appear in your markup:

1. Rules without at-rules come first, then breakpoints from narrowest to widest, then other at-rules.
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
