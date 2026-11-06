---
title: croff
description: The command line interface.
---

```bash
croff <command> [options]
```

Every command supports `--help`. `croff --version` prints the version.

## croff init

Sets up CROFF in the current project. It detects your build tool, framework and TypeScript, creates a config and a stylesheet, and wires up the integration. It never overwrites a file.

| Option                 | Purpose                                          |
| ---------------------- | ------------------------------------------------ |
| `--cwd <dir>`          | Project root. Defaults to the current directory. |
| `--integration <name>` | Force `vite`, `postcss` or `cli`.                |
| `--dry-run`            | Print what would happen, without writing.        |

## croff dev

Builds once, then rebuilds whenever the set of utilities in your content files changes, or the config or input stylesheet is edited. Problems are reported, but don't stop the watcher. The output isn't minified. Press Ctrl+C to stop.

| Option                | Purpose                                             |
| --------------------- | --------------------------------------------------- |
| `--cwd <dir>`         | Project root.                                       |
| `-c, --config <file>` | Path to the config file.                            |
| `-i, --input <file>`  | Stylesheet containing `@croff`.                     |
| `-o, --output <file>` | Where to write CSS. Required here or in the config. |
| `--sourcemap`         | Write a source map.                                 |
| `--once`              | Build once and exit, without watching.              |

## croff build

Generates production CSS once. Output is minified and deterministic. Exits with code 1, without writing, if an error is found.

| Option                | Purpose                                             |
| --------------------- | --------------------------------------------------- |
| `--cwd <dir>`         | Project root.                                       |
| `-c, --config <file>` | Path to the config file.                            |
| `-i, --input <file>`  | Stylesheet containing `@croff`.                     |
| `-o, --output <file>` | Where to write CSS. Required here or in the config. |
| `--no-minify`         | Keep the output readable.                           |
| `--sourcemap`         | Write a source map.                                 |

## croff check

Checks the config and theme tokens, then every expression in your content files. Reports unknown utilities, invalid values, whitespace inside expressions and class names built at runtime. Exits with code 1 if an error is found.

| Option                | Purpose                    |
| --------------------- | -------------------------- |
| `--cwd <dir>`         | Project root.              |
| `-c, --config <file>` | Path to the config file.   |
| `--strict`            | Treat warnings as errors.  |
| `--json`              | Print the results as JSON. |

```text
src/card.html:2:11: error unknown-utility: Unknown utility "pad".
  hint: Did you mean "padding"?

✗ 1 error, 0 warnings  14 utilities in 3 files
```

## Exit codes

| Code | Meaning                                                   |
| ---- | --------------------------------------------------------- |
| `0`  | Success.                                                  |
| `1`  | A problem was found, or the command was used incorrectly. |
