# @croffcss/theme

Design tokens: scales, merging, validation, CSS variables and the default theme.

```ts
import { createTheme, tokenVariable } from "@croffcss/theme";

const { theme, issues } = createTheme([{ colors: { accent: "#ff5c00" } }]);
tokenVariable("colors", "accent"); // "--croff-color-accent"
```

Part of [CROFF](https://croff.wisecode.tn), version 0.1.0 (pre-release).
