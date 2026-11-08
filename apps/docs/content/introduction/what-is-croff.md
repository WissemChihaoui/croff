---
title: What is CROFF?
description: An expressive utility-first CSS framework with its own language and compiler.
---

CROFF is a utility-first CSS framework. You style elements by writing small expressions in their `class` attribute, and a compiler turns exactly the expressions you used into a stylesheet.

```html compile
<button class="flex(row) align(center) gap(2) padding(3,5) bg(brand) hover:bg(brand-dark)">
  Save
</button>
```

Nothing runs in the browser. The result is ordinary CSS that any browser, framework or server template can use.

## What makes it different

**It has a language.** Expressions have a [formal grammar](/docs/concepts/utility-language) and a real parser. Utilities take arguments, arguments can be nested functions, and a mistake gets an error message with a position and a suggestion.

**Values are checked.** `gap(4)` must be a token in your theme. `gap(banana)` is an error, not a rule that silently does nothing. When you need a value outside the system, `gap[1.5rem]` says so explicitly.

**Output is predictable.** The stylesheet depends only on the set of expressions in your source, so builds are reproducible and diffs are meaningful.

**Your markup stays yours.** CROFF never rewrites a class attribute. The class you read in DevTools is the class you wrote.

## What's in version 0.1.0

- A tokenizer, parser and AST for the utility language.
- About 150 utilities across layout, flexbox, grid, sizing, spacing, typography, backgrounds, borders, effects, behavior and SVG.
- State and responsive variants that compose freely.
- A design token system that compiles to CSS custom properties.
- A source scanner that works on any text file.
- The `croff` CLI, a Vite plugin, a PostCSS plugin and a plugin API.

CROFF is a pre-release, published on npm under the `@croffcss` scope. The language may still change before 1.0.

## Where to go next

- [Installation](/docs/getting-started/installation) gets you running.
- [Core concepts](/docs/introduction/core-concepts) is a five minute tour.
- The [playground](/playground) runs the real compiler in your browser.
