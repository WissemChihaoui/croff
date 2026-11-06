---
title: Parsing
description: How expressions become structured data.
---

CROFF uses a real tokenizer and a recursive descent parser, not string splitting, because expressions nest.

## The AST

```ts
import { parse } from "@croff/core";

const result = parse("md:bg(alpha(brand,50))");
if (result.ok) {
  console.log(result.node);
}
```

```json
{
  "type": "utility",
  "source": "md:bg(alpha(brand,50))",
  "name": "bg",
  "variants": [{ "type": "variant", "name": "md" }],
  "arguments": [
    {
      "type": "call",
      "name": "alpha",
      "arguments": [
        { "type": "word", "value": "brand" },
        { "type": "word", "value": "50" }
      ]
    }
  ]
}
```

Every node also carries a `span` with its position in the source, which is how errors can point at the right character. Bracket values appear as an `arbitrary` node holding both the `raw` text and the decoded `value`.

## Parsing never throws

`parse` returns `{ ok: true, node }` or `{ ok: false, error }`. Errors have a stable `code`, a `message`, a `span` and sometimes a `hint`.

```text
Expected "," or ")" here. [unexpected-token]
  gap(a:b)
       ^
```

## Two kinds of error

An expression can be wrong in two different ways, and CROFF handles them differently.

|                            | Syntax error                       | Resolution error            |
| -------------------------- | ---------------------------------- | --------------------------- |
| **Question**               | Is this shaped like an expression? | Does it mean anything here? |
| **Found by**               | The parser                         | The registry, after parsing |
| **Depends on your config** | Never                              | Yes: your theme and plugins |
| **Example**                | `gap(4`                            | `gap(banana)`               |

Both are reported by `croff check` and fail `croff build`. Neither stops other expressions from compiling: each class stands alone, so `croff dev`, Vite and PostCSS report the problem and carry on.

## Syntax errors

| Code                   | Example                   |
| ---------------------- | ------------------------- |
| `empty`                | An empty string.          |
| `whitespace`           | `gap( 4 )`                |
| `invalid-character`    | `gap("4")`                |
| `invalid-name`         | `Flex(row)`               |
| `missing-value`        | `flex`                    |
| `unexpected-token`     | `gap(4)x`                 |
| `unterminated-call`    | `gap(4`                   |
| `empty-argument`       | `gap(4,)`                 |
| `unterminated-bracket` | `width[`                  |
| `unbalanced-bracket`   | `width[1px)]`             |
| `empty-bracket`        | `width[]`                 |
| `misplaced-bracket`    | `gap([1px])`              |
| `trailing-escape`      | `gap(4)\`                 |
| `duplicate-variant`    | `hover:hover:gap(4)`      |
| `too-deep`             | Nesting beyond 16 levels. |
| `unsupported-group`    | `hover:(gap(4),gap(8))`   |

`unsupported-group` means CROFF has no grouping syntax. Write each utility as its own expression: `hover:gap(4) hover:padding(8)`.

Syntax never depends on your configuration. Whether `gap(banana)` is valid isn't the parser's question; that's decided afterwards by the registry and your theme.

## Resolution errors

These come from the registry, so the same expression can be valid in one project and not in another.

| Code                    | Example                                           |
| ----------------------- | ------------------------------------------------- |
| `unknown-utility`       | `pad(4)`                                          |
| `unknown-variant`       | `hovr:gap(4)`                                     |
| `invalid-argument`      | `gap(banana)`                                     |
| `missing-argument`      | `gap()`                                           |
| `too-many-arguments`    | `gap(1,2)`                                        |
| `call-not-supported`    | A plugin utility that only takes a bracket value. |
| `bracket-not-supported` | `flex[row]`                                       |
| `unsafe-value`          | `width[1px;color:red]`                            |
