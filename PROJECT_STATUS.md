# Project status

**Version 0.1.0: implemented and verified, locally and on CI. Published on npm under the `@croffcss` scope.**

## Phases

| Phase                                                             | Status                           |
| ----------------------------------------------------------------- | -------------------------------- |
| 1. Foundation: monorepo, TypeScript, tests, architecture, grammar | Done                             |
| 2. Language and compiler                                          | Done                             |
| 3. Scanning and integrations                                      | Done                             |
| 4. Plugin system                                                  | Done                             |
| 5. Documentation and playground                                   | Done                             |
| 6. Validation and release preparation                             | Done, except for the items below |

## Where it lives

The source is public at [github.com/WissemChihaoui/croff](https://github.com/WissemChihaoui/croff). The docs site is live at [croff.wisecode.tn](https://croff.wisecode.tn). The packages are on [npm](https://www.npmjs.com/org/croffcss), under `@croffcss` because the `@croff` scope belongs to someone else.

## Remaining before a public release

- **Publish a contact address** for code of conduct reports.

## Worth doing

- **Replace the logo with a vector.** The site's logo files are derived from the provided PNG with the black background made transparent. The source has a small beige artifact on the first F of the wordmark, which shows up at large sizes.
- **Test Safari itself and real phones.** Browser tests cover Playwright's Chromium, Firefox and WebKit, verified on Windows so far.

## Known limitations

See [docs/release-notes-0.1.0.md](./docs/release-notes-0.1.0.md).

## Important decisions

Recorded in [docs/adr](./docs/adr):

1. ESM-only, Node 22.12+, plain `tsc -b`, no Turborepo.
2. One atomic rule per expression, with the expression as an escaped selector, and no rewriting of markup.
3. Parentheses are validated and brackets are raw.
4. `padding`, not `pad`, with no aliases. Distinct meanings for `bg` and `bg-color`.
5. A single `@croff` CSS directive across all integrations.
6. Docs on Vite and React with prerendering. The playground is a route, not a separate app.
7. `croff.config.ts`, loaded with jiti.
8. Variant groups were implemented, evaluated and rejected. There's no grouping syntax, and `hover:(...)` reports `unsupported-group`.
9. `[property:value]` sets any CSS property, for properties without a utility.
10. `@croffcss/ui` ships a prebuilt stylesheet, because the scanner ignores `node_modules`.

Other deviations from the original plan:

- The default `brand` color is `#c8fd12`, measured from the logo, rather than the `#A8FF32` in the planning example.
- `examples/react` was merged into `examples/vite-react`, and `examples/showcase` was added.

## Commands to resume

```bash
pnpm install
pnpm build:all     # packages, examples, docs
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm browsers:install   # once: about 500 MB, inside node_modules
pnpm test:browser
pnpm bench

pnpm docs:dev      # docs in development
pnpm --filter @croffcss/docs preview   # the built docs, served like a static host
```
