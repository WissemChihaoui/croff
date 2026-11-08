# @croffcss/postcss

PostCSS integration. Replaces `@croff` at-rules with generated CSS, and registers dependencies for watch mode.

```ts
import croff from "@croffcss/postcss";

export default { plugins: [croff()] };
```

Part of [CROFF](https://croff.wisecode.tn), a pre-release before 1.0.
