# ADR 0008: Variant groups (rejected)

**Status:** rejected on 2026-11-06. The feature was implemented, evaluated and removed. The last commit containing it is `19e8c01`.

**Context.** Repeating a variant is noisy: `hover:bg(brand) hover:padding(4) hover:radius(lg)`. We explored `hover:(bg(brand),padding(4),radius(lg))`, with groups expanded into ordinary expressions straight after parsing.

**Decision.** CROFF has no grouping syntax. Write each utility as its own expression, with its variants.

**Why it was rejected.**

- _More complexity than it was worth._ It needed grammar, parser, AST, expansion and compiler support, for something that saves typing but adds no capability.
- _CSS size grows badly._ ADR 0002 rules out rewriting markup, so the browser sees the whole group as one class name, and each rule has to select that long name. Written-out CSS levels off as tokens repeat, but group CSS keeps growing with each distinct group. On a synthetic project of 2,000 components, the result was 554 KB against 9.6 KB written out, or 39.5 KB against 1.4 KB gzipped.
- _Optimizing it isn't simple._ Merging adjacent rules saves little, and nothing once rules are shared between groups. The real fix is build-time HTML rewriting, which would reverse ADR 0002.
- _It complicates everything around it._ Integrations, dynamic classes and source maps all had to account for one class standing for several rules.
- _We prefer a simpler, more predictable architecture._

**Consequences.**

- There's no replacement grouping mechanism.
- `hover:(bg(brand),color(white))` reports the syntax error `unsupported-group`, and suggests individual expressions. Other expressions still compile. It's a syntax error, so `croff build` fails on it, as it does for any invalid class.
- To support this, the scanner recognizes the whole token, and `parse` recognizes the `variants:(` prefix. Nothing after the prefix is read, so no group parsing, AST node or expansion logic remains.
