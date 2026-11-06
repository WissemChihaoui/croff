# Contributing to CROFF

## Setting up

You need Node.js 22.12 or newer and pnpm 11.

```bash
pnpm install
pnpm build
pnpm test
```

Some tests use the built packages and the built examples, so run `pnpm build:all` for a complete run. Tests that need build output are skipped if it's missing.

## Commands

| Command                 | Purpose                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| `pnpm build`            | Compile all packages.                                                                          |
| `pnpm build:all`        | Compile packages, examples and the documentation site.                                         |
| `pnpm test`             | Run unit and integration tests.                                                                |
| `pnpm test:browser`     | Run tests in Chromium, Firefox and WebKit. Needs `pnpm build:all` and `pnpm browsers:install`. |
| `pnpm browsers:install` | Download the test browsers, about 500 MB, into `node_modules`.                                 |
| `pnpm typecheck`        | Check types in packages, tests, the docs and the examples.                                     |
| `pnpm lint`             | Run ESLint.                                                                                    |
| `pnpm format`           | Run Prettier.                                                                                  |
| `pnpm docs:dev`         | Run the documentation site.                                                                    |
| `pnpm bench`            | Run the benchmarks.                                                                            |
| `pnpm changeset`        | Describe your change for the changelog.                                                        |

## How the code is organized

Read [docs/architecture.md](./docs/architecture.md) first. The language is defined in [docs/grammar.md](./docs/grammar.md), and decisions are recorded in [docs/adr](./docs/adr).

## Guidelines

- **Keep the stages separate.** Parsing doesn't know about utilities, and the compiler doesn't know what any specific utility does.
- **Add utilities to the registry.** A utility is a definition in `packages/registry/src/utilities`. Its examples are compiled by tests and rendered in the docs, so the reference page writes itself. Order in the registry is cascade order: general before specific.
- **One name per concept.** Don't add aliases. `color` and `scale` are the deliberate exceptions, recorded in ADR 0004.
- **Test behavior, in a browser when it matters.** Tests in `tests/browser` run in real engines, for what text comparison can't prove, such as whether a selector matches. A bug fix starts with a failing test. A language change starts with `docs/grammar.md` and parser tests.
- **Keep the docs true.** Update them in the same change as any public API. Use a `compile` code fence, as in ` ```html compile `, to show generated CSS, which then can't go stale.
- **No new dependencies without a reason.** Say what it buys in your pull request.
- **Record significant decisions** as an ADR in `docs/adr`.

## Before opening a pull request

```bash
pnpm build:all
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm test:browser
```

If your change affects users, add a changeset with `pnpm changeset`.

Everyone taking part in this project is expected to follow the [code of conduct](./apps/docs/content/community/code-of-conduct.md).
