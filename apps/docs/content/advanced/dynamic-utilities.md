---
title: Dynamic utility limitations
description: Why class names must appear complete in your source.
---

CROFF reads your source as text at build time. It doesn't run your code, so it can only see expressions written out in full.

## What doesn't work

```text
// The scanner sees "bg(${color})", not a real expression. No CSS is generated.
<div className={`bg(${color})`} />

// The scanner sees two meaningless strings.
<div className={"gap(" + size + ")"} />

// Assembled from data at runtime.
const name = ["text-size", "(lg)"].join("");
```

## What to do instead

Write complete expressions, and choose between them.

```tsx
const backgrounds = {
  brand: "bg(brand)",
  dark: "bg(dark)",
};

function Badge({ color }: { color: keyof typeof backgrounds }) {
  return <span className={backgrounds[color]}>New</span>;
}
```

For truly dynamic values, such as a color chosen by a user, set a custom property and use a utility that reads it:

```tsx
function Swatch({ color }: { color: string }) {
  return <div className="bg(var(--swatch))" style={{ "--swatch": color } as React.CSSProperties} />;
}
```

## What CROFF detects

Template interpolation is detected, and `croff check` warns about it, as do the integrations:

```text
src/badge.tsx:4:22: warning dynamic-expression: "bg(${color})" is built at runtime,
so CROFF cannot see the final class name and no CSS is generated for it.
```

Plain string concatenation and arrays can't be told apart from unrelated code, so those go undetected. Expressions inside an interpolation are still found if they're complete:

```tsx
function Panel({ open }: { open: boolean }) {
  return <div className={`gap(4) ${open ? "width(full)" : "width(0)"}`} />;
}
```

## Content from outside your source

Class names in a CMS, a database or a package outside your `content` patterns aren't seen. Add the files to `content`, or list the expressions in a file that's scanned.
