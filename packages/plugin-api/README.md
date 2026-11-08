# @croffcss/plugin-api

The plugin interface, validation and registration. Plugin authors should import `definePlugin` from `@croffcss/core`.

```ts
import { definePlugin } from "@croffcss/plugin-api";

export default definePlugin({
  name: "croff-plugin-example",
  variants: { first: { selector: "&:first-child" } },
});
```

Part of [CROFF](https://croff.wisecode.tn), a pre-release before 1.0.
