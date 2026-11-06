import type {
  ArgumentNode,
  ArbitraryNode,
  ExpressionNode,
  GroupNode,
  Span,
  VariantNode,
} from "./ast.js";
import type { ParseError } from "./errors.js";
import { tokenize, type Token } from "./tokenizer.js";

export type ParseResult = { ok: true; node: ExpressionNode } | { ok: false; error: ParseError };

const MAX_DEPTH = 16;

const UTILITY_NAME = /^[a-z][a-z0-9-]*$/;
const VARIANT_NAME = /^[a-z0-9][a-z0-9-]*$/;
const FUNCTION_NAME = /^[a-z-][a-z0-9-]*$/;

class Failure {
  constructor(readonly error: ParseError) {}
}

function fail(code: ParseError["code"], message: string, span: Span, hint?: string): never {
  throw new Failure({ code, message, span, ...(hint ? { hint } : {}) });
}

class Parser {
  private index = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly source: string,
  ) {}

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.index + offset, this.tokens.length - 1)]!;
  }

  private next(): Token {
    const token = this.peek();
    this.index++;
    return token;
  }

  parseRoot(): ExpressionNode {
    const node = this.parseNode(new Set(), 0, false);
    const end = this.peek();
    if (end.kind !== "eof") {
      fail("unexpected-token", "Unexpected text after the end of the expression.", end.span);
    }
    return node;
  }

  /** Where the most recently consumed token ended. */
  private previousEnd(): number {
    return this.tokens[this.index - 1]!.span.end;
  }

  /**
   * Parses an utility or a group. `inherited` holds the variants of enclosing
   * groups, because a repeated variant is an error however it's spelled.
   */
  private parseNode(
    inherited: ReadonlySet<string>,
    depth: number,
    inGroup: boolean,
  ): ExpressionNode {
    const start = this.peek().span.start;
    const variants: VariantNode[] = [];
    const seen = new Set(inherited);

    while (this.peek().kind === "word" && this.peek(1).kind === "colon") {
      const word = this.next() as Extract<Token, { kind: "word" }>;
      this.next();
      if (!VARIANT_NAME.test(word.value)) {
        fail("invalid-name", `"${word.value}" is not a valid variant name.`, word.span);
      }
      if (seen.has(word.value)) {
        fail("duplicate-variant", `The variant "${word.value}" is used twice.`, word.span);
      }
      seen.add(word.value);
      variants.push({ type: "variant", name: word.value, span: word.span });
    }

    if (this.peek().kind === "lparen") {
      return this.parseGroup(variants, seen, start, depth);
    }

    const nameToken = this.next();
    if (nameToken.kind !== "word") {
      fail("unexpected-token", "Expected a utility name.", nameToken.span);
    }
    if (!UTILITY_NAME.test(nameToken.value)) {
      fail(
        "invalid-name",
        `"${nameToken.value}" is not a valid utility name.`,
        nameToken.span,
        "Utility names are lowercase words separated by hyphens.",
      );
    }

    const after = this.peek();
    let args: ArgumentNode[] = [];
    let arbitrary: ArbitraryNode | undefined;
    if (after.kind === "lparen") {
      args = this.parseCall(depth).args;
    } else if (after.kind === "bracket") {
      this.next();
      arbitrary = { type: "arbitrary", raw: after.raw, value: after.value, span: after.span };
    } else if (
      after.kind === "eof" ||
      (inGroup && (after.kind === "comma" || after.kind === "rparen"))
    ) {
      fail(
        "missing-value",
        `"${nameToken.value}" has no value. A utility always has "(...)" or "[...]".`,
        nameToken.span,
        `Did you mean ${nameToken.value}()?`,
      );
    } else {
      fail("unexpected-token", `Expected "(" or "[" after "${nameToken.value}".`, after.span);
    }

    const span = { start, end: this.previousEnd() };
    return {
      type: "utility",
      source: this.source.slice(span.start, span.end),
      name: nameToken.value,
      nameSpan: nameToken.span,
      variants,
      arguments: args,
      ...(arbitrary ? { arbitrary } : {}),
      span,
    };
  }

  private parseGroup(
    variants: VariantNode[],
    seen: ReadonlySet<string>,
    start: number,
    depth: number,
  ): GroupNode {
    const open = this.next();
    if (variants.length === 0) {
      fail(
        "group-without-variant",
        "A group needs a variant in front of it.",
        open.span,
        "Write the variant before the parentheses: hover:(bg(brand),gap(4)).",
      );
    }
    if (depth >= MAX_DEPTH) {
      fail("too-deep", `Groups cannot be nested more than ${MAX_DEPTH} levels deep.`, open.span);
    }
    if (this.peek().kind === "rparen") {
      fail("empty-group", "This group has no utilities in it.", {
        start: open.span.start,
        end: this.next().span.end,
      });
    }

    const members: ExpressionNode[] = [];
    for (;;) {
      const first = this.peek();
      if (first.kind === "comma" || first.kind === "rparen") {
        fail("empty-group-member", "A utility is missing here.", first.span);
      }
      if (first.kind === "eof") {
        fail("unterminated-group", 'This "(" has no matching ")".', open.span);
      }
      members.push(this.parseNode(seen, depth + 1, true));
      const token = this.next();
      if (token.kind === "rparen") break;
      if (token.kind === "eof") {
        fail("unterminated-group", 'This "(" has no matching ")".', open.span);
      }
      if (token.kind !== "comma") {
        fail("unexpected-token", 'Expected "," or ")" here.', token.span);
      }
    }

    const span = { start, end: this.previousEnd() };
    return {
      type: "group",
      source: this.source.slice(span.start, span.end),
      variants,
      members,
      span,
    };
  }

  private parseCall(depth: number): { args: ArgumentNode[]; end: number } {
    const open = this.next();
    if (depth >= MAX_DEPTH) {
      fail("too-deep", `Calls cannot be nested more than ${MAX_DEPTH} levels deep.`, open.span);
    }
    const args: ArgumentNode[] = [];
    if (this.peek().kind === "rparen") {
      return { args, end: this.next().span.end };
    }
    for (;;) {
      args.push(this.parseArgument(depth));
      const token = this.next();
      if (token.kind === "rparen") return { args, end: token.span.end };
      if (token.kind === "eof") {
        fail("unterminated-call", 'This "(" has no matching ")".', open.span);
      }
      if (token.kind !== "comma") {
        fail("unexpected-token", 'Expected "," or ")" here.', token.span);
      }
    }
  }

  private parseArgument(depth: number): ArgumentNode {
    const token = this.next();
    switch (token.kind) {
      case "word": {
        if (this.peek().kind === "lparen") {
          if (!FUNCTION_NAME.test(token.value)) {
            fail("invalid-name", `"${token.value}" is not a valid function name.`, token.span);
          }
          const { args, end } = this.parseCall(depth + 1);
          return {
            type: "call",
            name: token.value,
            arguments: args,
            span: { start: token.span.start, end },
          };
        }
        return { type: "word", value: token.value, span: token.span };
      }
      case "comma":
      case "rparen":
        return fail("empty-argument", "An argument is missing here.", token.span);
      case "eof":
        return fail("unterminated-call", 'A "(" has no matching ")".', token.span);
      case "bracket":
        return fail(
          "misplaced-bracket",
          "A bracket value cannot be used as an argument.",
          token.span,
          "Bracket values replace the whole call: width[320px].",
        );
      default:
        return fail("unexpected-token", "Expected an argument here.", token.span);
    }
  }
}

/**
 * Parses one CROFF expression. Never throws on invalid input: failures are
 * returned as values so that callers can collect diagnostics.
 *
 * @unstable The grammar and the AST may change between 0.x releases.
 */
export function parse(input: string): ParseResult {
  const source = input.trim();
  if (source.length === 0) {
    return {
      ok: false,
      error: { code: "empty", message: "The expression is empty.", span: { start: 0, end: 0 } },
    };
  }
  const tokenized = tokenize(source);
  if (!tokenized.ok) return tokenized;
  try {
    return { ok: true, node: new Parser(tokenized.tokens, source).parseRoot() };
  } catch (thrown) {
    if (thrown instanceof Failure) return { ok: false, error: thrown.error };
    throw thrown;
  }
}
