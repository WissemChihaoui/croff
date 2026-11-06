# The CROFF utility language — formal grammar

Status: **v0 (language version 1), not final**. This document is normative for this
release, but the grammar may still change before 1.0. The parser in
[`packages/parser`](../packages/parser) implements it, and the tests in
[`packages/parser/test`](../packages/parser/test) pin every rule below.

## 1. Overview

A CROFF _expression_ is one token of an HTML `class` attribute:

```text
md:hover:bg(brand-dark)
└┬┘ └─┬─┘ └┬┘ └───┬───┘
variant   name  argument
```

There are exactly two value forms, and the difference is meaningful:

| Form          | Example       | Meaning                                                         |
| ------------- | ------------- | --------------------------------------------------------------- |
| Call `(…)`    | `gap(4)`      | Language values. Validated against tokens, keywords and ranges. |
| Bracket `[…]` | `gap[1.5rem]` | Raw CSS. An explicit escape hatch; only sanity-checked.         |

A bare word is **never** a utility. `flex` is just a class name; `flex()` is a
utility. This keeps CROFF from ever colliding with your own class names and
keeps source scanning precise.

## 2. Grammar (EBNF)

```ebnf
expression   = { variant , ":" } , utility ;

variant      = variant-name ;
utility      = utility-name , ( call | arbitrary ) ;

call         = "(" , [ argument , { "," , argument } ] , ")" ;
argument     = function | word ;
function     = function-name , call ;

arbitrary    = "[" , raw , "]" ;
raw          = raw-item , { raw-item } ;
raw-item     = raw-char
             | escape
             | "(" , { raw-item } , ")"
             | "[" , { raw-item } , "]"
             | string ;
string       = "'" , { any-char-except-unescaped-quote } , "'"
             | '"' , { any-char-except-unescaped-quote } , '"' ;

utility-name  = lower , { lower | digit | "-" } ;
variant-name  = ( lower | digit ) , { lower | digit | "-" } ;
function-name = ( lower | "-" ) , { lower | digit | "-" } ;

word         = word-item , { word-item } ;
word-item    = word-char | escape ;
word-char    = letter | digit | "-" | "_" | "." | "/" | "%" | "#" | "+" | "*" | "!"
             | non-ascii ;
escape       = "\" , any-non-whitespace-char ;

lower        = "a" … "z" ;
letter       = "a" … "z" | "A" … "Z" ;
digit        = "0" … "9" ;
```

`raw-char` is any character other than whitespace, `(`, `)`, `[`, `]`, `'`, `"`
and `\`.

## 3. Whitespace

An expression must not contain whitespace. Browsers split the `class` attribute
on whitespace, so `width[calc(100% - 1px)]` would become three unrelated
classes and could never match a selector. The parser rejects it with the code
`whitespace` rather than silently producing CSS that cannot apply.

Leading and trailing whitespace around a complete expression is ignored.

To write a space **inside a bracket value**, use an underscore:

```text
grid-area[1_/_2_/_3_/_4]   →   grid-area: 1 / 2 / 3 / 4
```

## 4. Escaping

### In call arguments

`\x` produces the literal character `x`, for any non-whitespace `x`. It removes
any structural meaning: `\,` `\(` `\)` `\[` `\]` `\:` `\\`.

### In bracket values

| Source              | Result      | Notes                                                  |
| ------------------- | ----------- | ------------------------------------------------------ |
| `_`                 | space       | except inside `url(…)`, where underscores stay literal |
| `\_`                | `_`         | a literal underscore                                   |
| `\(` `\)` `\[` `\]` | the bracket | does not count towards nesting                         |
| `\\`                | `\`         | a literal backslash                                    |
| `\x`                | `\x`        | any other escape passes through to CSS (`\201C`)       |

### In the generated selector

Selectors are escaped by the compiler using the CSSOM `CSS.escape` algorithm.
You never write CSS escapes in markup.

## 5. Nested functions

An argument may itself be a function call, to any depth up to 16. A function's
meaning is defined by the argument type of the utility that receives it:

```text
bg(alpha(brand,50))         → color-mix(in srgb, var(--croff-color-brand) 50%, transparent)
width(var(--sidebar))       → var(--sidebar)
transform(rotate(45deg))    → rotate(45deg)
```

A function a utility does not accept is an `invalid-argument` error.

## 6. Bracket values

The parser checks that brackets, parentheses and quotes balance, then decodes
the value according to §4. Before CSS is emitted the compiler additionally:

1. rejects `;`, `{`, `}` and `</` outside of strings, so a bracket value cannot
   break out of its declaration;
2. inserts the spaces CSS requires around `+` and `-` in `calc()`, `min()`,
   `max()` and `clamp()`:

   ```text
   height[calc(100vh-80px)]                → calc(100vh - 80px)
   width[calc(100%-var(--sidebar-width))]  → calc(100% - var(--sidebar-width))
   ```

   Custom property names inside `var()` are left untouched.

## 7. Variants

Variants are listed left to right, before the utility:

```text
md:hover:focus:bg(brand)
```

- All variants are applied. Each one contributes a selector transformation
  (`&:hover`) or an at-rule (`@media (min-width: 768px)`).
- At-rules nest in the order written. Selector transformations apply
  left-to-right, innermost last.
- Different orderings are different class names (`md:hover:x` and `hover:md:x`)
  but select the same elements under the same conditions.
- A repeated variant (`hover:hover:x`) is a `duplicate-variant` error.

## 8. No grouping syntax

Applying variants to a parenthesized list of utilities isn't part of the language:

```text
hover:(bg(brand),color(white))    Error: unsupported-group
hover:bg(brand) hover:color(white)    Write this instead
```

`parse` recognizes the prefix, variants followed by `(`, and reports `unsupported-group` without reading any further. See [ADR 0008](./adr/0008-variant-groups.md) for why.

## 9. Errors

The parser never throws on bad input. `parse()` returns
`{ ok: false, error }` where `error` has a stable `code`, a human `message`, a
source `span` and, when possible, a `hint`.

| Code                   | Trigger                                              |
| ---------------------- | ---------------------------------------------------- |
| `empty`                | The expression is empty.                             |
| `whitespace`           | Whitespace inside an expression.                     |
| `invalid-character`    | A character outside the grammar.                     |
| `invalid-name`         | A malformed utility/variant/function name.           |
| `missing-value`        | A bare word with no `(…)` or `[…]`.                  |
| `unexpected-token`     | A token out of place, e.g. `a(b)c`.                  |
| `unterminated-call`    | A `(` with no matching `)`.                          |
| `empty-argument`       | `gap(,4)` or `gap(4,)`.                              |
| `unterminated-bracket` | A `[` with no matching `]`.                          |
| `unbalanced-bracket`   | Mismatched nesting inside `[…]`.                     |
| `empty-bracket`        | `width[]`.                                           |
| `misplaced-bracket`    | A bracket value used as an argument.                 |
| `trailing-escape`      | An expression ending in `\`.                         |
| `duplicate-variant`    | The same variant used twice.                         |
| `too-deep`             | Nesting deeper than 16 levels.                       |
| `unsupported-group`    | Variants followed by `(`, as in `hover:(a(1),b(2))`. |

Name and value resolution (`unknown-utility`, `invalid-argument`, …) happens
later, in the registry. Syntax errors never depend on configuration.

## 10. Naming conventions

- Utility names are lowercase, hyphen-separated, and spell out the concept:
  `padding-x`, `min-width`, `border-color`. Abbreviations and aliases are avoided.
  The deliberate exceptions, `color` and `scale`, are recorded in ADR 0004.
- Variant names are lowercase. They may start with a digit (`2xl`).
- Token names may contain letters, digits, `-` and `_`. Dots are not allowed
  because they are hostile to CSS custom property names.
