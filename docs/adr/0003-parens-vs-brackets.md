# ADR 0003: Parentheses are validated, brackets are raw

**Status:** accepted

**Decision.** `name(...)` accepts only language values: theme tokens, keywords, bounded numbers, fractions and registered functions. `name[...]` accepts raw CSS. `width(320px)` is an error whose hint suggests `width[320px]`.

**Why.** Having two spellings for the same thing makes a code base harder to read and lint. With this rule, any bracket in the markup marks an off-system value, so reviewers and `croff check` can distinguish design-system values from one-offs. Typos in tokens are always errors, never silently passed through to CSS.

**Consequences.** `var(--x)`, `alpha(token,50)` and `transform(rotate(45deg))` are registered functions and stay in parentheses.
