---
title: React example
description: A working React and Vite project.
---

`examples/vite-react` in the repository is a small working app.

## Files

```ts
import react from "@vitejs/plugin-react";
import croff from "@croffcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), croff()],
});
```

```ts
import { defineConfig } from "@croffcss/core";

export default defineConfig({
  content: ["src/**/*.tsx"],
  theme: {
    colors: {
      // A custom token, used as bg(surface).
      surface: "#141414",
    },
  },
});
```

```tsx
const variants = {
  brand: "bg(brand) color(dark) hover:bg(brand-dark)",
  ghost: "border(1,gray-700) color(light) hover:border-color(brand)",
};

function Button({ kind, children }: { kind: keyof typeof variants; children: React.ReactNode }) {
  return (
    <button
      className={`padding(2,4) radius(sm) text-weight(medium) transition(colors) ${variants[kind]}`}
    >
      {children}
    </button>
  );
}
```

## Run it

```bash
pnpm install
pnpm build
pnpm --filter @croffcss/example-vite-react dev
```

`examples/showcase` is a larger set of components: buttons, cards, navigation, forms, layouts and typography. It runs through PostCSS and includes a small local plugin.
