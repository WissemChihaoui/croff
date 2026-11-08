# @croffcss/registry

Utility and variant definitions, and resolving an AST into CSS declarations. The compiler has no knowledge of specific utilities: they all live here as data.

```ts
import { builtinUtilities, createRegistry, values } from "@croffcss/registry";

builtinUtilities.map((utility) => utility.name);
values.token("spacing"); // A value type accepting tokens from a scale.
```

Part of [CROFF](https://croff.wisecode.tn), a pre-release before 1.0.
