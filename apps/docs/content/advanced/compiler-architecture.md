---
title: Compiler architecture
description: From a string to a stylesheet.
---

## Stages

```text
"md:gap(4)"
    │  tokenize                (@croff/parser)
    ▼
word colon word lparen word rparen eof
    │  parse
    ▼
UtilityNode { name, variants, arguments }
    │  resolve                 (@croff/registry)
    ▼
[["gap", "var(--croff-spacing-4)"]]   + tokens used
    │  apply variants          (@croff/compiler)
    ▼
CompiledRule { selector, declarations, atRules, sort }
    │  sort and print
    ▼
CSS
```

A [variant group](/docs/concepts/variant-groups) is expanded right after parsing. Each member then goes through the stages above as an ordinary expression, so there's no separate path for groups. The only trace left is in printing, where each rule also selects the groups containing it.

## The registry is data

Utilities are definitions, not branches in the compiler. The compiler doesn't know what `gap` is. A definition declares arguments made of value types, and the properties they set or a function that computes declarations. That's why plugin utilities have the same powers as built-ins, and why the utility reference can be generated.

## Value types

A value type is a small object that either resolves an argument to a CSS value or declines it. `values.token("spacing")` checks the theme and records the token as used. Recording usage is how unused custom properties stay out of the output.

## Caching

A `Compiler` instance memoizes each expression's result for its lifetime. A new theme or plugin set means a new instance. Compiling again after a file change resolves only new expressions, then sorts and prints.

## Sorting

Each rule has a sort key computed from itself: at-rules, then states, then registry order, then text. It uses code-unit comparison, not locale comparison, so that the result doesn't vary by machine.

## Printing

The printer writes minified or readable output in one pass, tracking line and column for source maps.
