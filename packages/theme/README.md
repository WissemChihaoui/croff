# @croff/theme

Design tokens: scales, merging, validation, CSS variables and the default theme.

```ts
import { createTheme, tokenVariable } from "@croff/theme";

const { theme, issues } = createTheme([{ colors: { accent: "#ff5c00" } }]);
tokenVariable("colors", "accent"); // "--croff-color-accent"
```

Part of [CROFF](../../README.md), version 0.1.0 (pre-release, not published yet).
