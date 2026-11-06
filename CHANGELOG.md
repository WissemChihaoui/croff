## 0.1.0 (pre-release)

The first release, for public testing. Nothing has been published to a package registry yet.

### Language

- A formal grammar, with a real tokenizer and parser that produce a structured AST and never throw on bad input.
- Call form `name(...)` for validated values, and bracket form `name[...]` for raw CSS.
- Nested functions: `alpha()`, `var()` and transform functions.
- `color()` and `scale()`: concise, preferred names for setting text color and scaling.
- Variants that compose: states such as `hover:` and `first:`, the `before:` and `after:` boxes, the preferences `dark:`, `motion-reduce:` and `print:`, and responsive variants from your theme's breakpoints.
- `[property:value]` for setting any CSS property, with the same safety checks as other bracket values.

### Compiler

- About 150 utilities across layout, flexbox, grid, sizing, spacing, typography, backgrounds, borders, effects, behavior and SVG.
- One atomic rule per expression, with the expression as an escaped selector.
- Deterministic output, independent of input order.
- Only the rules and theme variables in use are emitted.
- Minified output and source maps.

### Theme

- Design tokens in scales, compiled to CSS custom properties.
- Merging over a default theme, token removal with `null`, and an empty preset.
- Validation of token names and values, including a scale that isn't an object, and names that collide with each other, with a keyword or with a variant.

### Tooling

- A source scanner that works on any text file, with incremental rescans and file watching.
- The `croff` CLI: `init`, `dev`, `build` and `check`.
- A Vite plugin with hot updates.
- A PostCSS plugin.
- A plugin API for adding utilities, variants and tokens. A plugin that throws or returns unsafe CSS only fails its own expression, and the error names the plugin.

### Documentation

- A documentation site with search, a utility reference generated from the registry and a playground that runs the real compiler.
- Example projects for plain HTML, React with Vite, and a component showcase through PostCSS.
