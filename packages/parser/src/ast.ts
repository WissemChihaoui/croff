/** A half-open range of UTF-16 code units in the source expression. */
export interface Span {
  start: number;
  end: number;
}

export interface VariantNode {
  type: "variant";
  name: string;
  span: Span;
}

/** A plain argument value, with escapes already decoded. */
export interface WordNode {
  type: "word";
  value: string;
  span: Span;
}

/** A nested function argument, e.g. `alpha(brand,50)`. */
export interface CallNode {
  type: "call";
  name: string;
  arguments: ArgumentNode[];
  span: Span;
}

export type ArgumentNode = WordNode | CallNode;

/** A bracket value, e.g. `[calc(100%-1px)]`. */
export interface ArbitraryNode {
  type: "arbitrary";
  /** The text between the brackets, exactly as written. */
  raw: string;
  /** The decoded value: underscores are spaces, escapes are resolved. */
  value: string;
  span: Span;
}

/**
 * The root of every successfully parsed expression.
 *
 * @unstable The AST may change between 0.x releases.
 */
export interface UtilityNode {
  type: "utility";
  /** The expression as written, without surrounding whitespace. In a group, just this member. */
  source: string;
  name: string;
  nameSpan: Span;
  variants: VariantNode[];
  /** Call-form arguments. Empty for the bracket form and for `name()`. */
  arguments: ArgumentNode[];
  /** Present only for the bracket form. */
  arbitrary?: ArbitraryNode;
  span: Span;
}

/**
 * A variant group, such as `md:(gap(4),hover:bg(brand))`. Syntactic sugar: `expand`
 * turns it into ordinary expressions, which is all that later stages ever see.
 *
 * @unstable The AST may change between 0.x releases.
 */
export interface GroupNode {
  type: "group";
  /** The whole group as written. */
  source: string;
  /** The variants directly in front of this group's parentheses. */
  variants: VariantNode[];
  /** Spans in members are positions in the outermost group's source. */
  members: ExpressionNode[];
  span: Span;
}

export type ExpressionNode = UtilityNode | GroupNode;
