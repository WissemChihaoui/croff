# @croffcss/compiler

Turns expressions into deterministic CSS: resolution cache, ordering, selector escaping, printing and source maps.

```ts
import { Compiler } from "@croffcss/compiler";
import { createRegistry } from "@croffcss/registry";
import { createTheme } from "@croffcss/theme";

const { theme } = createTheme();
const compiler = new Compiler({ theme, registry: createRegistry(theme) });
const { css, failures } = compiler.compile(["gap(4)", "md:hover:bg(brand)"], { minify: true });
```

Part of [CROFF](https://croff.wisecode.tn), a pre-release before 1.0.
