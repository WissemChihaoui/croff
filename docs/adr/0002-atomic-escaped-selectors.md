# ADR 0002: Atomic rules with escaped selectors, no source rewriting

**Status:** accepted

**Context.** The compiler could emit hashed classes and rewrite markup, or emit one rule per expression, using the expression itself as the class name.

**Decision.** Each expression becomes one rule. The selector is the expression, escaped with the `CSS.escape` algorithm: `.md\:width\(1\/2\)`.

**Why.**

- _Debuggable._ DevTools shows exactly what the developer wrote.
- _Framework-agnostic._ No transform has to understand JSX, Vue or Svelte templates. Any tool that produces a `class` attribute works, including server templates and plain HTML.
- _Stable._ A selector depends only on the expression, never on hash inputs or build order.
- _Small._ Reusing an expression reuses its rule.

**Cost.** Class names are longer than hashes, which is mitigated by compression, and markup is not minified. Expressions also cannot contain whitespace; see the grammar.
