# @croff/scanner

Finds CROFF expressions in text and files. `@croff/scanner/extract` is browser-safe; the main entry adds file scanning and watching.

```ts
import { Scanner, watchFiles } from "@croff/scanner";

const scanner = new Scanner({ cwd: process.cwd(), content: ["src/**/*.tsx"] });
const { candidates } = await scanner.scan();
const handle = watchFiles(scanner, { onChange: (result) => console.log(result.candidates.length) });
```

Part of [CROFF](../../README.md), version 0.1.0 (pre-release, not published yet).
