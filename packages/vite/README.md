# @croffcss/vite

Vite integration. Compiles any stylesheet containing `@croff`, and hot-updates it when the set of utilities in your source changes.

```ts
import croff from "@croffcss/vite";
import { defineConfig } from "vite";

export default defineConfig({ plugins: [croff()] });
```

Part of [CROFF](https://croff.wisecode.tn), version 0.1.0 (pre-release).
