---
title: Troubleshooting
description: Common problems and their fixes.
---

## A utility has no effect

Run `croff check` first. Then:

- **Is the file scanned?** Only files matching `content` are read. See [Source scanning](/docs/configuration/source-scanning).
- **Is the class built at runtime?** `` `bg(${color})` `` can't be seen. Write complete expressions.
- **Is another rule winning?** Your own CSS placed after `@croff;` wins over utilities with the same specificity. So does a higher-specificity selector.
- **Is it the right element?** `justify(center)` does nothing without `flex()` or `display(grid)`.

## "Unknown utility"

CROFF avoids aliases, so it's `padding`, not `pad`. The error suggests the closest name. Browse the [utility reference](/docs/utilities/layout), or use search.

## "is not a valid value"

Parentheses only accept tokens, keywords and registered functions. `width(320px)` fails because `320px` isn't a token. Use `width[320px]`.

## "contains whitespace"

Browsers split `class` on whitespace, so `width[calc(100% - 1px)]` is three classes that can never match a rule. Remove the spaces, since CROFF adds the ones `calc()` needs: `width[calc(100%-1px)]`. Elsewhere, use underscores: `margin[0_auto]`.

## Nothing is generated at all

- Check that your stylesheet contains `@croff;` and is imported by your app.
- `croff build` warns if `content` matches no files. The patterns are relative to the project root.

## Vite doesn't update

- Check that the file you're editing matches `content`. The plugin only rebuilds CSS for those.
- Changes to `croff.config` restart the dev server. Watch for errors in its output.

## Styles differ between development and production

Output order doesn't depend on the build mode. The usual cause is the order your own stylesheets are imported in, relative to `croff.css`.
