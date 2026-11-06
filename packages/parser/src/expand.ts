import type { ExpressionNode, Span } from "./ast.js";

/**
 * An ordinary expression, and where it was written.
 *
 * @unstable May change between 0.x releases.
 */
export interface ExpandedExpression {
  /** Text that parses as a single utility: `md:hover:bg(brand)`. */
  expression: string;
  /** The position of this utility in the text that was parsed. */
  span: Span;
}

/**
 * Flattens a parsed expression into ordinary expressions, in source order and
 * without repeats. Members inherit the variants of every enclosing group, outermost
 * first. A plain utility expands to itself.
 *
 * @unstable May change between 0.x releases.
 */
export function expand(node: ExpressionNode): ExpandedExpression[] {
  const expanded = new Map<string, ExpandedExpression>();
  const walk = (current: ExpressionNode, prefix: string) => {
    if (current.type === "utility") {
      const expression = prefix + current.source;
      if (!expanded.has(expression)) expanded.set(expression, { expression, span: current.span });
      return;
    }
    const inherited = prefix + current.variants.map((variant) => `${variant.name}:`).join("");
    for (const member of current.members) walk(member, inherited);
  };
  walk(node, "");
  return [...expanded.values()];
}
