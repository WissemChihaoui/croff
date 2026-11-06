# @croff/plugin-api

The plugin interface, validation and registration. Plugin authors should import `definePlugin` from `@croff/core`.

```ts
import { definePlugin } from "@croff/plugin-api";

export default definePlugin({
  name: "croff-plugin-example",
  variants: { first: { selector: "&:first-child" } },
});
```

Part of [CROFF](../../README.md), version 0.1.0 (pre-release, not published yet).
