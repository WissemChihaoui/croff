---
title: Build optimization
description: Keeping your CSS small.
---

## Only what's used

Output scales with the number of distinct expressions you use, not with the size of the framework. A stylesheet with 500 distinct expressions has about 500 rules, however many pages use them.

## Theme variables

The default `variables: "used"` emits only the tokens in use. The size of your theme doesn't affect output, unless you set `"all"`.

## Reuse

Repeating an expression costs nothing, while a bracket value used once adds a rule. Prefer tokens and you'll tend to reuse more.

## Narrow your content patterns

Patterns that match less scan faster and avoid false positives. Don't point `content` at large generated files.

## Compression

Class names are longer than hashes, so uncompressed CSS and HTML are larger than a hashing approach would produce. Repetitive text compresses well, so serve your assets with gzip or Brotli.

## CI

`croff check --strict` catches invalid expressions and runtime-built classes before they reach a build.
