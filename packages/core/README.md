# @croff/core

The public API. `@croff/core` is the browser-safe engine and `defineConfig`. `@croff/core/node` adds config loading and projects on disk.

```ts
import { createCroff, defineConfig } from "@croff/core";
import { Project } from "@croff/core/node";

createCroff(defineConfig({ theme: { colors: { accent: "#ff5c00" } } })).compile(["bg(accent)"]);

const project = await Project.load();
const { css, diagnostics } = await project.generate({ minify: true });
```

Part of [CROFF](../../README.md), version 0.1.0 (pre-release, not published yet).
