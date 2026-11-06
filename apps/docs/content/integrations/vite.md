---
title: Vite
description: The native Vite plugin.
---

```ts
import croff from "@croff/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [croff()],
});
```

Any stylesheet containing `@croff` is compiled. Stylesheets without it aren't touched.

## Options

| Option   | Purpose                                           |
| -------- | ------------------------------------------------- |
| `config` | Path to the config file, relative to Vite's root. |

## Development

- Source files matching `content` are watched, including new and deleted ones.
- CSS is regenerated only if the set of expressions changed. Editing text or logic causes no CSS work.
- Stylesheets update through Vite's hot update path, without a full reload.
- Editing, adding or removing `croff.config` restarts the dev server.
- Problems are logged once, and don't stop the server.

## Production

`vite build` scans your sources, compiles once and hands the CSS to Vite's pipeline. In a build, problems are logged but don't fail it. Add `croff check` to CI to enforce them.

## Compatibility

The plugin supports Vite 7 and 8. The test suite runs against 8, and 7 was checked by hand for builds, hot updates and config changes.
