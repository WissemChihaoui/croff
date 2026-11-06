---
title: Contributing
description: Help build CROFF.
---

The source is on [GitHub](https://github.com/WissemChihaoui/croff). The guidelines below are also in `CONTRIBUTING.md`.

## Setting up

```bash
pnpm install
pnpm build
pnpm test
```

Node.js 22.12 or newer and pnpm 11 are required.

## Useful commands

| Command             | Purpose                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| `pnpm build`        | Compile all packages.                                                                          |
| `pnpm test`         | Run unit and integration tests. Some use the built packages, so build first.                   |
| `pnpm test:browser` | Run tests in Chromium, Firefox and WebKit. Needs `pnpm build:all` and `pnpm browsers:install`. |
| `pnpm typecheck`    | Check types everywhere.                                                                        |
| `pnpm lint`         | Run ESLint.                                                                                    |
| `pnpm format`       | Run Prettier.                                                                                  |
| `pnpm docs:dev`     | Run the documentation site.                                                                    |
| `pnpm bench`        | Run the benchmarks.                                                                            |
| `pnpm changeset`    | Describe your change for the changelog.                                                        |

## Guidelines

- Keep parsing, resolution and printing separate.
- Add utilities to the registry. The compiler doesn't know about specific utilities.
- One name per concept. Don't add aliases. `color` and `scale` are the deliberate exceptions.
- Add tests. A bug fix starts with a test that fails.
- Update the docs in the same change as any public API.
- Record significant decisions as an ADR in `docs/adr`.
