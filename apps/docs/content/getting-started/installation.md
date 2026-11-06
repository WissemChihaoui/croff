---
title: Installation
description: Get CROFF into a project.
---

> Version 0.1.0 is a pre-release and isn't on a package registry yet. These instructions build it from source. The commands will get simpler once the packages are published.

## Requirements

- Node.js 22.12 or newer.
- pnpm 11, to build CROFF itself. Your own project can use any package manager that understands `link:` dependencies.

## Build CROFF from source

From a checkout of the repository:

```bash
pnpm install
pnpm build
```

This compiles every package to `packages/*/dist`.

## Add it to your project

Link the packages you need from your checkout. Assuming it's next to your project, for a Vite project:

```bash
pnpm add -D link:../croff/packages/core link:../croff/packages/vite link:../croff/packages/cli
```

Linked packages keep using the dependencies installed in your CROFF checkout, so keep that `node_modules` in place.

`link:` dependencies don't get a `croff` command, so add a script for it to your `package.json`:

```json
{
  "scripts": {
    "croff": "node node_modules/@croff/cli/dist/bin.js"
  }
}
```

Then use `pnpm croff init`, `pnpm croff build` and so on wherever these docs say `croff`.

## Once packages are published

This is what installation will look like. It doesn't work yet.

```bash
pnpm add -D @croff/core @croff/vite
```

## Next steps

- [Project setup](/docs/getting-started/project-setup) configures a project automatically with `croff init`.
- [Vite setup](/docs/getting-started/vite-setup) walks through the Vite plugin by hand.
