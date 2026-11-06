# @croff/compiler

Turns expressions into deterministic CSS: resolution cache, ordering, selector escaping, printing and source maps.

```ts
import { Compiler } from "@croff/compiler";
import { createRegistry } from "@croff/registry";
import { createTheme } from "@croff/theme";

const { theme } = createTheme();
const compiler = new Compiler({ theme, registry: createRegistry(theme) });
const { css, failures } = compiler.compile(["gap(4)", "md:hover:bg(brand)"], { minify: true });
```

Part of [CROFF](../../README.md), version 0.1.0 (pre-release, not published yet).
