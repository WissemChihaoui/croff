# @croff/vite

Vite integration. Compiles any stylesheet containing `@croff`, and hot-updates it when the set of utilities in your source changes.

```ts
import croff from "@croff/vite";
import { defineConfig } from "vite";

export default defineConfig({ plugins: [croff()] });
```

Part of [CROFF](../../README.md), version 0.1.0 (pre-release, not published yet).
