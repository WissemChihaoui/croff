# @croff/parser

Tokenizer, parser and AST for the CROFF utility language. No dependencies, and no knowledge of utilities or themes.

```ts
import { parse, formatParseError } from "@croff/parser";

const result = parse("md:bg(alpha(brand,50))");
if (result.ok)
  console.log(result.node.name); // "bg"
else console.error(formatParseError(result.error, "md:bg(alpha(brand,50))"));
```

Part of [CROFF](../../README.md), version 0.1.0 (pre-release, not published yet).
