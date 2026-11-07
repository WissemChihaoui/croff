# @croffcss/core

The public API. `@croffcss/core` is the browser-safe engine and `defineConfig`. `@croffcss/core/node` adds config loading and projects on disk.

```ts
import { createCroff, defineConfig } from "@croffcss/core";
import { Project } from "@croffcss/core/node";

createCroff(defineConfig({ theme: { colors: { accent: "#ff5c00" } } })).compile(["bg(accent)"]);

const project = await Project.load();
const { css, diagnostics } = await project.generate({ minify: true });
```

Part of [CROFF](https://croff.wisecode.tn), version 0.1.0 (pre-release).
