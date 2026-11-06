# Project status

**Version 0.1.0: implemented and verified locally. Not published.**

## Phases

| Phase                                                             | Status                           |
| ----------------------------------------------------------------- | -------------------------------- |
| 1. Foundation: monorepo, TypeScript, tests, architecture, grammar | Done                             |
| 2. Language and compiler                                          | Done                             |
| 3. Scanning and integrations                                      | Done                             |
| 4. Plugin system                                                  | Done                             |
| 5. Documentation and playground                                   | Done                             |
| 6. Validation and release preparation                             | Done, except for the items below |

## Staying local for now

Hosting and GitHub are deliberately deferred. The project isn't under version control, nothing is published and the docs aren't deployed. Everything is verified locally.

## Remaining before a public release

- **Create the git repository.** Until then CI has never run, and it targets Ubuntu and Node 24 as well, neither of which has been run. Changesets was verified in a throwaway repository.
- **Confirm package names and publish.** Confirm the `@croff` npm scope is available.
- **Set the public links.** `apps/docs/src/site.config.ts` holds `githubUrl: null` and `published: false`. Until they're set, the footer says the repository isn't public and the install guide explains building from source.
- **Publish a contact address** for code of conduct reports.

## Worth doing, and possible locally

- **Replace the logo with a vector.** The site's logo files are derived from the provided PNG with the black background made transparent. The source has a small beige artifact on the first F of the wordmark, which shows up at large sizes.
- **Test Safari itself and real phones.** Browser tests cover Playwright's Chromium, Firefox and WebKit on Windows.

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
8. Variant groups are sugar, expanded right after parsing. Rules select the group's class, since markup isn't rewritten.

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
pnpm --filter @croff/docs preview   # the built docs, served like a static host
```
