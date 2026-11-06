# ADR 0008: Variant groups are sugar, expanded after parsing

**Status:** accepted

**Context.** Repeating a variant is noisy: `hover:bg(brand) hover:padding(4) hover:radius(lg)`. We want `hover:(bg(brand),padding(4),radius(lg))`, with the same result as writing it out.

**Decisions.**

- _The parser owns groups._ `parse` produces a `GroupNode`, and `expand` flattens it into ordinary expressions with their positions. The parser stays independent of the theme and registry.
- _Everything downstream sees ordinary expressions._ The compiler expands each written class, then resolves each member through the existing `resolve` path. There is no second pipeline, so members cannot behave differently.
- _One rule per ordinary expression, selecting every class that contains it._ Since ADR 0002 rules out rewriting markup, the class in the browser is the whole group, so the rule for `hover:bg(brand)` has to select `.hover\:\(bg\(brand\)\,padding\(4\)\):hover`. Expansion can't be literally invisible in the CSS. Declarations, at-rules, order and cascade are all identical, and the selector list is the only difference.
- _A group's rule is the expression's rule._ If `hover:gap(4)` and `hover:(gap(4),padding(2))` both appear, there is one rule with two selectors. This preserves cascade order exactly, which a separate block of rules for each group wouldn't.
- _Syntax errors reject the whole group. Resolution errors reject one member._ A broken group has no reliable structure, whereas `md:(gap(4),pad(4))` means the same as `md:gap(4) md:pad(4)`, where `md:gap(4)` would compile.
- _A group needs a variant._ `(gap(4))` would do nothing but obscure the class.
- _No whitespace._ The class attribute splits on it. This could be revisited with a source transform, which ADR 0002 avoids.

**Consequences.**

- A long group's name appears in each of its rules' selectors, so uncompressed CSS is larger than the written-out form. It compresses well.
- `parse` returns a union of `UtilityNode` and `GroupNode`. The AST was already marked unstable.
- The group's class name carries the variants, not the members, so tools matching class names by exact expression (`hover:bg(brand)`) won't find one inside a group.
