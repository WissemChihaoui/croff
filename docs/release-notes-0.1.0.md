# CROFF 0.1.0 release notes

CROFF 0.1.0 is the first version, for public testing. It's a utility-first CSS framework with its own language and compiler.

```html
<div
  class="flex(col) md:flex(row) gap(4) bg(brand) hover:bg(brand-dark) width[calc(100%-2rem)]"
></div>
```

## What you can do with it

- Style with validated expressions: `gap(4)`, `bg(alpha(brand,50))`, `md:hover:width(1/2)`.
- Use raw CSS explicitly: `width[calc(100%-var(--sidebar-width))]`.
- Define colors, spacing, type and breakpoints as tokens, which compile to custom properties.
- Generate only the CSS you use, deterministically, with Vite, PostCSS or the standalone CLI.
- Catch mistakes with `croff check`, including typos, invalid values and class names built at runtime.
- Add utilities, variants and tokens through plugins.

## Packages

All at 0.1.0: `@croff/core`, `@croff/parser`, `@croff/theme`, `@croff/registry`, `@croff/compiler`, `@croff/scanner`, `@croff/plugin-api`, `@croff/cli`, `@croff/vite` and `@croff/postcss`.

**Not published yet.** Build from source until a registry release is authorized.

## Known limitations

- `ring` and `shadow` both set `box-shadow`, so they don't compose. `ring` wins.
- `scale` and `transform` both set `transform`, so they don't compose. `scale` wins.
- Class names built at runtime can't be compiled. Template interpolation is detected and warned about, but concatenation isn't detectable.
- In `vite build`, invalid expressions are logged and don't fail the build. Use `croff check` in CI.
- No arbitrary variants, `important` modifier or container query variants yet.
- Tested on Windows in Playwright's Chromium, Firefox and WebKit, but not in Safari itself or on real phones. CI has never run.
- The grammar and AST aren't final, and the language may still change before 1.0. `parse`, `expand`, the AST and the plugin API are marked `@unstable`.

## Upgrading

There's nothing to upgrade from.
