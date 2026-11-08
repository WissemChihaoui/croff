# @croffcss/ui

Ready-to-use components for CROFF, with the Chamfer design system.

Chamfer takes its shapes from the CROFF logo: cut corners on anything you can press, the logo's slash as a mark on badges, checkboxes, switches and loading states, wide display headings and mono labels. It comes in dark and light themes, and every color, font and size is a token you can override.

```bash
pnpm add @croffcss/ui
```

```ts
import "@croffcss/ui/styles.css";
import { Button } from "@croffcss/ui/react";
```

```tsx
<Button tone="primary">Save</Button>
```

Not using React? Each component is also a function that returns its class names:

```ts
import "@croffcss/ui/styles.css";
import { button } from "@croffcss/ui";

const classes = button({ tone: "primary" });
```

## Theming

Override any token in your own CSS, after the import:

```css
:root {
  --croff-color-brand: #ff5c00;
  --croff-color-accent: #ff5c00;
}
```

Put `data-theme="light"` on the page, or on any part of it, for the light theme.

## Writing your own components

Add `uiPlugin` from `@croffcss/ui/plugin` to your CROFF config to get the same tokens, the `cut` utility and the variants the components use.

See the [component documentation](https://croff.wisecode.tn/docs/components/overview) for every component.

This is a pre-release before 1.0, so the API may still change.
