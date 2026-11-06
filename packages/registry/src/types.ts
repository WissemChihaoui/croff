import type { ArgumentNode, UtilityNode } from "@croff/parser";
import type { ResolvedTheme } from "@croff/theme";

/** Passed to value types while resolving an argument. */
export interface ResolveContext {
  theme: ResolvedTheme;
  /** Records a token as used and returns its `var(...)` reference. */
  useToken(scale: string, token: string): string;
}

/** How a value type presents itself in docs and error messages. */
export interface ValueDescription {
  /** Short label, e.g. "colors token" or "integer 0–100". */
  label: string;
  /** Concrete values, when the set is finite. */
  values?: string[];
  /** The theme scale, when values come from one. */
  scale?: string;
}

/**
 * Decides whether an argument is valid, and if so what CSS it means.
 *
 * @unstable Value types may change between 0.x releases.
 */
export interface ValueType {
  kind: string;
  describe(theme: ResolvedTheme): ValueDescription;
  /** Returns the CSS value, or `undefined` if this type does not accept the argument. */
  resolve(argument: ArgumentNode, context: ResolveContext): string | undefined;
}

export interface ArgumentSpec {
  name: string;
  types: ValueType[];
  optional?: boolean;
  /** Accepts one or more values. Only valid on the last argument. */
  variadic?: boolean;
}

/** Declarations in output order. */
export type Declarations = Record<string, string>;

export interface UtilityInput {
  /** Resolved CSS values in positional order. Variadic values are flattened in. */
  args: string[];
  /** The original source text of each argument, for keyword checks. */
  words: string[];
  /** Lets a utility refer to theme tokens beyond its arguments. */
  context: ResolveContext;
}

/** @unstable The shape of a utility definition may change between 0.x releases. */
export interface UtilityDefinition {
  name: string;
  /** Groups utilities in documentation, e.g. "layout". */
  category: string;
  description: string;
  /** Positional arguments for the call form. Omit to disable the call form. */
  args?: ArgumentSpec[];
  /** Properties set to the single resolved value. Use this or `compile`. */
  properties?: string[];
  /** Custom output, for anything `properties` cannot express. */
  compile?: (input: UtilityInput) => Declarations;
  /**
   * The bracket form: properties to set to the value, or a function for anything
   * else. Defaults to `properties`. Set to `false` to disable the bracket form.
   */
  arbitrary?: string[] | false | ((value: string) => Declarations);
  /** Valid example expressions. Compiled by tests and rendered in the docs. */
  examples: string[];
  /** Extra guidance for the reference page. */
  notes?: string;
}

/** @unstable The shape of a variant definition may change between 0.x releases. */
export interface VariantDefinition {
  name: string;
  /** Selector template; `&` is the utility's selector. Example: `&:hover`. */
  selector?: string;
  /** At-rule wrapping the rule. Example: `@media (min-width: 768px)`. */
  atRule?: string;
  description?: string;
  /** Marks variants derived from the theme's breakpoints. */
  breakpoint?: { width: number };
}

export type ResolveErrorCode =
  | "unknown-utility"
  | "unknown-variant"
  | "invalid-argument"
  | "missing-argument"
  | "too-many-arguments"
  | "call-not-supported"
  | "bracket-not-supported"
  | "unsafe-value";

export interface ResolveError {
  code: ResolveErrorCode;
  message: string;
  hint?: string;
  /** A corrected expression, when one can be confidently suggested. */
  suggestion?: string;
}

export type ResolvedUtility =
  | { ok: true; node: UtilityNode; declarations: [property: string, value: string][] }
  | { ok: false; error: ResolveError };
