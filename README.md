<p>
  <img src="apps/docs/public/brand/croff-logo.png" alt="CROFF" width="320" />
</p>

**Style without the noise.** An expressive utility-first CSS framework, with its own language and compiler. Read the [documentation](https://croff.wisecode.tn), or try it in the [playground](https://croff.wisecode.tn/playground).

```html
<button
  class="flex(row) align(center) gap(2) padding(3,5) bg(brand) hover:bg(brand-dark) md:text-size(lg)"
>
  Save
</button>
```

```css
:root {
  --croff-color-brand: #c8fd12;
  --croff-color-brand-dark: #a4d30b;
  /* Only the tokens you use. */
}

.flex\(row\) {
  display: flex;
  flex-direction: row;
}

.hover\:bg\(brand-dark\):hover {
  background-color: var(--croff-color-brand-dark);
}
```

> **Status: version 0.1.0, pre-release.** Everything described here works, but the packages aren't on a registry yet and the language may still change. See [PROJECT_STATUS.md](./PROJECT_STATUS.md).

## Why CROFF

- **A language, not a list of class names.** Expressions have a [formal grammar](./docs/grammar.md) and a real parser, including nested functions and raw CSS values.
- **Checked values.** `gap(4)` must be a token. `gap(banana)` is an error with a position and a suggestion. `gap[1.5rem]` is an explicit escape hatch.
- **Zero runtime.** Everything happens at build time. The output is ordinary CSS.
- **Deterministic.** The stylesheet depends only on the set of expressions in your source.
- **Design tokens first.** Tokens compile to custom properties, and only those you use are emitted.
- **Your markup stays yours.** Nothing is rewritten, so the class you see in DevTools is the class you wrote.
- **Extensible.** Plugins add utilities, variants and tokens through the same path as the built-ins.

## Try it

```bash
git clone https://github.com/WissemChihaoui/croff.git
cd croff
pnpm install
pnpm build

# The documentation site, with the playground.
pnpm docs:dev

# The examples.
pnpm --filter @croff/example-vite-react dev
pnpm --filter @croff/example-showcase dev
pnpm --filter @croff/example-vanilla build
```

Requires Node.js 22.12 or newer and pnpm 11.

## Use it in a project

Until the packages are published, link them from a checkout next to your project:

```bash
pnpm add -D link:../croff/packages/core link:../croff/packages/vite link:../croff/packages/cli
pnpm pkg set scripts.croff="node node_modules/@croff/cli/dist/bin.js"
pnpm croff init
```

`link:` dependencies don't get a `croff` command, which is what the script is for. `croff init` detects your project, creates a config and a stylesheet, and wires up the integration.

```css
/* src/croff.css */
@croff reset;
@croff;
```

| Integration | How                                             |
| ----------- | ----------------------------------------------- |
| Vite        | `plugins: [croff()]` from `@croff/vite`         |
| PostCSS     | `plugins: [croff()]` from `@croff/postcss`      |
| Standalone  | `croff dev` and `croff build` from `@croff/cli` |

## The CLI

```text
croff init    Set up CROFF in the current project
croff dev     Watch source files and regenerate CSS as they change
croff build   Generate production CSS once
croff check   Validate configuration and utility syntax
```

## Repository

| Path                                | Contents                                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `packages/parser`                   | Tokenizer, parser and AST                                                                               |
| `packages/theme`                    | Design tokens and CSS variables                                                                         |
| `packages/registry`                 | Utility and variant definitions                                                                         |
| `packages/compiler`                 | CSS generation                                                                                          |
| `packages/scanner`                  | Source scanning and watching                                                                            |
| `packages/plugin-api`               | The plugin interface                                                                                    |
| `packages/core`                     | Public API and project orchestration                                                                    |
| `packages/cli`                      | The `croff` command                                                                                     |
| `packages/vite`, `packages/postcss` | Integrations                                                                                            |
| `apps/docs`                         | Documentation site and playground                                                                       |
| `examples/`                         | Vanilla HTML, React with Vite, and a component showcase                                                 |
| `docs/`                             | [Architecture](./docs/architecture.md), [grammar](./docs/grammar.md) and [decision records](./docs/adr) |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Licensed under the [MIT License](./LICENSE).
