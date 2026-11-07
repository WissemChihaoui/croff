---
title: Components
description: Ready-to-use components, in a design system of their own.
---

`@croffcss/ui` gives you components to use straight away, built with CROFF. See them all in the [gallery](/docs/components/gallery).

## The Chamfer design system

Chamfer takes its shapes from the CROFF logo:

- **Cut corners** on anything you can press, at the logo's angle.
- **The slash** as a mark. It leads badges and labels, fills a checked checkbox, is the thumb of a switch, and sweeps across a loading indicator.
- **Wide display headings and mono labels**, over quiet body text.
- **Neon lime on near-black**, with a light theme that keeps lime as a fill and darkens it for text, so that it stays readable.

## Installation

```bash
pnpm add @croffcss/ui
```

Then import the stylesheet once, before your own styles.

```ts
import "@croffcss/ui/styles.css";
```

The stylesheet is ready to use, so you don't need CROFF's build tools just for the components.

## With React

```tsx
import { Button, Field, Input } from "@croffcss/ui/react";

export function SignUp() {
  return (
    <form>
      <Field label="Email" hint="We'll only use it to reply.">
        <Input type="email" />
      </Field>
      <Button type="submit">Sign up</Button>
    </form>
  );
}
```

## Without React

Each component is also a function that returns its class names, so it works in any framework or template.

```ts
import { button } from "@croffcss/ui";

const classes = button({ tone: "secondary", size: "sm" });
```

Tabs and the dialog need a little behavior as well. The React components handle that for you. Without React, you write it, and the gallery shows the markup each one expects.

## Theming

Every color, font and size is a token, so changing them doesn't need a rebuild. Override them after the import:

```css
:root {
  --croff-color-brand: #ff5c00;
  --croff-color-accent: #ff5c00;
}
```

| Token                    | Used for                                    |
| ------------------------ | ------------------------------------------- |
| `--croff-color-brand`    | Fills: primary buttons, checked controls.   |
| `--croff-color-on-brand` | Text and marks on those fills.              |
| `--croff-color-accent`   | Lines and text: focus rings, selected tabs. |
| `--croff-color-ink`      | The page.                                   |
| `--croff-color-surface`  | Cards and dialogs.                          |
| `--croff-color-raised`   | Secondary buttons, headers.                 |
| `--croff-color-fg`       | Main text.                                  |
| `--croff-color-soft`     | Secondary text.                             |
| `--croff-color-faint`    | The quietest text.                          |
| `--croff-color-line`     | Hairlines.                                  |
| `--croff-font-display`   | Headings.                                   |

If you change colors, check that the text on them is still readable.

## Dark and light

Dark is the default. Put `data-theme="light"` on the page, or on any part of it. To follow the visitor's system, set that attribute from `matchMedia("(prefers-color-scheme: light)")`.

```html
<body data-theme="light">
  <p>The components in here use the light theme.</p>
</body>
```

The `page` function sets the background, text color and font of whichever element you give it.

## Fonts

The components use Archivo, Inter and JetBrains Mono when they're available, and fall back to system fonts. Load them yourself for the exact look, or change `--croff-font-display`, `--croff-font-sans` and `--croff-font-mono`.

## Writing your own components

Add the plugin to your CROFF config to write your own components in the same language.

```ts
import { defineConfig } from "@croffcss/core";
import { uiPlugin } from "@croffcss/ui/plugin";

export default defineConfig({
  plugins: [uiPlugin],
});
```

That gives you the tokens, the `cut` utility for the angled corners, and the variants the components use: `checked:`, `invalid:`, `selected:`, `group-open:`, `placeholder:`, `backdrop:` and `details-marker:`.

## Accessibility

The components are real form controls and native elements wherever possible. Focus stays visible, keyboard behavior follows the usual conventions, and motion stops for visitors who ask for less of it. The gallery is checked with axe in both themes, but automated checks only find some problems, so test your own pages with a keyboard and a screen reader.

## What's not here yet

This is the first set. There's no tooltip, menu, combobox, date picker or toast yet, and the whole stylesheet is loaded even if you use one component.
