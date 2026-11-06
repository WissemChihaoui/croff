---
title: React setup
description: Patterns for using CROFF in React components.
---

Follow [Vite setup](/docs/getting-started/vite-setup) first. CROFF needs nothing React-specific, since `className` is just a string.

## Conditional classes

Write complete expressions, and choose between them at runtime:

```tsx
function Tab({ active }: { active: boolean }) {
  return (
    <button className={active ? "color(brand)" : "color(muted) hover:color(light)"}>
      Overview
    </button>
  );
}
```

## Reusable variants

An object of complete strings works well:

```tsx
const kinds = {
  primary: "bg(brand) color(dark) hover:bg(brand-dark)",
  ghost: "border(1,gray-700) color(light) hover:border-color(brand)",
};

function Button({ kind, children }: { kind: keyof typeof kinds; children: React.ReactNode }) {
  return <button className={`padding(2,4) radius(sm) ${kinds[kind]}`}>{children}</button>;
}
```

## What doesn't work

CROFF reads your source as text, so a name assembled at runtime can't be seen:

```text
// Not compiled: the scanner never sees "bg(brand)".
<div className={`bg(${color})`} />
```

`croff check` warns about this. See [Dynamic utility limitations](/docs/advanced/dynamic-utilities).

## Helper libraries

Strings passed to `cx`, `clsx`, `classnames`, `cn` and `cva` are recognized as class names, which gives you stricter diagnostics. See [Source scanning](/docs/configuration/source-scanning).
