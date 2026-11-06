---
title: Browser support
description: What the generated CSS needs from a browser.
---

CROFF generates standard CSS and has no runtime, so browser support depends only on the features your expressions compile to.

## The baseline

Everything rests on two widely supported features: CSS custom properties, and class selectors with escaped characters. Every browser released in roughly the last eight years handles both.

## Features with newer requirements

A few utilities compile to newer CSS. You only depend on these if you use them.

| Expression                          | CSS feature      | Chrome | Firefox | Safari |
| ----------------------------------- | ---------------- | ------ | ------- | ------ |
| `alpha(token,n)`                    | `color-mix()`    | 111    | 113     | 16.2   |
| `columns(subgrid)`, `rows(subgrid)` | `subgrid`        | 117    | 71      | 16     |
| `focus-visible:`                    | `:focus-visible` | 86     | 85      | 15.4   |
| `aspect-ratio(...)`                 | `aspect-ratio`   | 88     | 89      | 15     |
| `gap(...)` on flex containers       | flexbox `gap`    | 84     | 63      | 14.1   |

## What has been tested

`pnpm test:browser` runs in the Chromium, Firefox and WebKit builds from Playwright, on Windows so far. It checks that every documented example is accepted, that selectors match their class names, and that breakpoints, states, the cascade, the examples and this site all behave correctly.

Playwright's WebKit is close to Safari, but it isn't Safari, and nothing has been tested on a real phone. The version numbers in the table above come from known feature support, not from testing those versions.
