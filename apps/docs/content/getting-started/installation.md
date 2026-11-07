---
title: Installation
description: Get CROFF into a project.
---

> Version 0.1.0 is a pre-release. Everything described here works, but the language may still change before 1.0.

## Requirements

- Node.js 22.12 or newer.
- Any package manager: pnpm, npm, Yarn or Bun.

## Install the packages

For a Vite project:

```bash
pnpm add -D @croffcss/core @croffcss/vite @croffcss/cli
```

Use `@croffcss/postcss` instead of `@croffcss/vite` for PostCSS or Next.js. With only the CLI, `@croffcss/core` and `@croffcss/cli` are enough.

## Run the CLI

`@croffcss/cli` provides the `croff` command. Run it through your package manager, for example to configure the project:

```bash
pnpm croff init
```

With npm, that's `npx croff init`. Install `@croffcss/cli` first: otherwise `npx` looks for a package named `croff` on the registry, which isn't part of CROFF.

## Build from source

To try unreleased changes, build CROFF yourself. This needs pnpm 11.

```bash
git clone https://github.com/WissemChihaoui/croff.git
cd croff
pnpm install
pnpm build
```

Then link the packages from your checkout, assuming it's next to your project:

```bash
pnpm add -D link:../croff/packages/core link:../croff/packages/vite link:../croff/packages/cli
```

Linked packages keep using the dependencies installed in your CROFF checkout, so keep that `node_modules` in place. They don't get a `croff` command either, so add a script for it to your `package.json`:

```json
{
  "scripts": {
    "croff": "node node_modules/@croffcss/cli/dist/bin.js"
  }
}
```

## Next steps

- [Project setup](/docs/getting-started/project-setup) configures a project automatically with `croff init`.
- [Vite setup](/docs/getting-started/vite-setup) walks through the Vite plugin by hand.
