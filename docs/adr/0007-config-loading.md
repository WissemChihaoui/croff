# ADR 0007: Configuration via `croff.config.ts`, loaded with jiti

**Status:** accepted

**Decision.** Configuration files may be `.ts`, `.mts`, `.js` or `.mjs`, and are loaded with `jiti`, which lives only in `@croff/core/node`.

**Why.** TypeScript config is the expected experience. Native type stripping isn't available across our Node support range. `jiti` is dependency-free and well proven. The browser entry point never touches it.

**Theme merging.** A config's `theme` merges token-by-token over the default theme. A `null` token removes it. `preset: "none"` starts from an empty theme. Precedence: default theme, then plugins in array order, then the user's config.
