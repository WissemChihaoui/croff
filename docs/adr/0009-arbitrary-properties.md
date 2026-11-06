# ADR 0009: Arbitrary properties

**Status:** accepted on 2026-11-06.

**Context.** Bracket values only worked after a utility, so a property without a utility couldn't be set from a class at all. CROFF's answer was to write a plugin or plain CSS, which is too much for one declaration.

**Decision.** `[property:value]` sets any CSS property. It takes variants and follows the same rules as a bracket value, including the safety checks. It sorts after every utility. Utilities remain the preferred form, and a bracket still marks an off-system value in review, as in ADR 0003.

**Consequences.**

- The property name is checked against the grammar, not a list of real properties. A list would have to track CSS, and would reject new properties and custom properties. So a typo reaches the stylesheet, where the browser ignores it.
- The scanner only reads this form in class attributes, class helpers and strings, because in plain code the same shape means something else, such as the index signature `[key:string]`. Everywhere else, valid expressions generate CSS in any context.
- `float[left]` stays an error when no such utility exists, with a hint pointing to `[float:left]`.
