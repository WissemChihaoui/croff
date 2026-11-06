---
title: Utility language
description: The syntax of a CROFF expression.
---

## Shape of an expression

```text
md:hover:bg(brand-dark)
```

An expression is zero or more variants, each followed by a colon, then a utility name, then a value.

## Grammar

```text
expression   = { variant ":" } ( utility | group )
group        = "(" expression { "," expression } ")"
utility      = name ( call | bracket )
call         = "(" [ argument { "," argument } ] ")"
argument     = function | word
function     = name call
bracket      = "[" raw-css "]"
```

The full grammar, with the character classes and every rule below in detail, is in `docs/grammar.md` in the repository.

## Call form

Arguments in parentheses are validated.

```html compile
<div class="padding(4,8) bg(alpha(brand,50)) width(1/2)"></div>
```

Empty parentheses are valid where every argument is optional: `flex()`, `border()`.

## Nested functions

An argument can be a function, nested to any depth up to 16. What's allowed depends on the utility.

| Function                                                                | Used by              | Meaning                        |
| ----------------------------------------------------------------------- | -------------------- | ------------------------------ |
| `alpha(color,percent)`                                                  | Color utilities      | A color at an opacity.         |
| `var(--name)`, `var(--name,fallback)`                                   | Most value utilities | A custom property of your own. |
| `rotate(...)`, `translate-y(...)`, `scale(...)` as a factor, and others | `transform`          | A transform function.          |

## Bracket form

Anything in brackets is raw CSS. See [Arbitrary values](/docs/concepts/arbitrary-values).

## No whitespace

An expression can't contain whitespace, because browsers split `class` on whitespace.

```text
width[calc(100% - 1px)]    Error: whitespace
width[calc(100%-1px)]      OK: CROFF inserts the spaces calc() needs
margin[0_auto]             OK: an underscore is a space
```

## Escaping

In call arguments, a backslash makes the next character literal: `\,` `\(` `\)` `\:`. In brackets, `\_` is a literal underscore and `\[` `\]` `\(` `\)` don't count as nesting. Other backslash sequences pass through to CSS, so `content['\201C']` works.

You never write CSS escapes for the class name itself. The compiler handles that.

## Naming

Utilities are lowercase and hyphenated, and spell out what they do: `padding-x`, `min-width`, `border-color`. Aliases are avoided. The two deliberate shortcuts are `color`, for `text-color`, and `scale`, for a scaling `transform`.

## Variant groups

`hover:(bg(brand),padding(4))` applies a variant to several utilities. See [Variant groups](/docs/concepts/variant-groups).

## Bare words are not utilities

A word with no value, like `flex` or `card`, is an ordinary class that CROFF ignores. That's why `group` works as a marker for `group-hover`, and why CROFF can't conflict with your classes.
