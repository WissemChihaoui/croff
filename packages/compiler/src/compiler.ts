import { expand, parse, type ExpandedExpression, type ParseError, type Span } from "@croff/parser";
import type { Registry, ResolveContext, ResolveError } from "@croff/registry";
import { themeVariables, tokenKey, tokenVariable, type ResolvedTheme } from "@croff/theme";
import { classSelector } from "./escape.js";
import { RESET_CSS } from "./reset.js";
import { encodeSourceMap, type Mapping, type SourceMapV3 } from "./sourcemap.js";

export interface SourceLocation {
  /** Path of the file, relative to the project root. */
  file: string;
  /** Zero-based line. */
  line: number;
  /** Zero-based column. */
  column: number;
}

/** An expression to compile. A location enables source maps. */
export type CompileInput = string | { expression: string; location?: SourceLocation };

/** @unstable The shape of a compiled rule may change between 0.x releases. */
export interface CompiledRule {
  /** The ordinary expression this rule implements. */
  expression: string;
  /** The classes this rule applies to: the expression itself, and groups containing it. */
  classes: string[];
  /** One selector for each of `classes`. */
  selectors: string[];
  /** The selector list, as it appears in the CSS. */
  selector: string;
  /** The rule's selector with `&` in place of the class. */
  selectorTemplate: string;
  declarations: [property: string, value: string][];
  atRules: string[];
  /** `scale/token` keys this rule depends on. */
  tokens: string[];
  sort: { atRule: number[]; variants: number[]; utility: number };
}

export type CompileFailure =
  | { expression: string; phase: "parse"; error: ParseError }
  | {
      /** The ordinary expression that failed. */
      expression: string;
      phase: "resolve";
      error: ResolveError;
      /** For a member of a variant group: the class as written, and the member's position in it. */
      group?: { expression: string; span: Span };
    };

export type ResolveResult =
  { ok: true; rule: CompiledRule } | { ok: false; failure: CompileFailure };

export type CssLayer = "reset" | "theme" | "utilities";

export interface CompileOptions {
  minify?: boolean;
  /** Which theme variables to emit. Defaults to those used by the compiled rules. */
  variables?: "used" | "all" | "none";
  /** Sections to emit, always in the order reset, theme, utilities. Defaults to theme and utilities. */
  layers?: CssLayer[];
  /** Generate a Source Map v3 relating rules to where each expression was first used. */
  sourceMap?: boolean;
  /** The output file name recorded in the source map. */
  file?: string;
}

export interface CompileResult {
  css: string;
  rules: CompiledRule[];
  failures: CompileFailure[];
  map?: SourceMapV3;
  /** The positions behind `map`, for callers placing this CSS inside something larger. */
  mappings?: Mapping[];
}

export interface CompilerContext {
  theme: ResolvedTheme;
  registry: Registry;
}

/** Compares order arrays lexicographically; a missing element sorts first. */
function compareKeys(a: number[], b: number[]): number {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const left = a[i] ?? -1;
    const right = b[i] ?? -1;
    if (left !== right) return left - right;
  }
  return 0;
}

function compareRules(a: CompiledRule, b: CompiledRule): number {
  return (
    compareKeys(a.sort.atRule, b.sort.atRule) ||
    compareKeys(a.sort.variants, b.sort.variants) ||
    a.sort.utility - b.sort.utility ||
    (a.expression < b.expression ? -1 : a.expression > b.expression ? 1 : 0)
  );
}

/** A copy of a rule that selects the given classes. */
function withClasses(rule: CompiledRule, classes: Set<string>): CompiledRule {
  const sorted = [...classes].sort((a, b) => {
    if (a === rule.expression) return -1;
    if (b === rule.expression) return 1;
    return a < b ? -1 : 1;
  });
  const selectors = sorted.map((name) =>
    rule.selectorTemplate.replaceAll("&", () => classSelector(name)),
  );
  return { ...rule, classes: sorted, selectors, selector: selectors.join(", ") };
}

function failureKey(failure: CompileFailure): string {
  const written = failure.phase === "resolve" ? failure.group?.expression : undefined;
  return `${written ?? failure.expression}\0${failure.expression}`;
}

/** Writes text while tracking the current line and column, for source maps. */
class Writer {
  text = "";
  line = 0;
  column = 0;

  write(chunk: string): void {
    this.text += chunk;
    const lastNewline = chunk.lastIndexOf("\n");
    if (lastNewline === -1) {
      this.column += chunk.length;
    } else {
      for (let i = 0; i <= lastNewline; i++) if (chunk.charCodeAt(i) === 10) this.line++;
      this.column = chunk.length - lastNewline - 1;
    }
  }
}

export class Compiler {
  private readonly cache = new Map<string, ResolveResult>();
  private readonly expansions = new Map<string, ExpandedExpression[] | CompileFailure>();

  constructor(private readonly context: CompilerContext) {}

  /**
   * The ordinary expressions a written class stands for: itself, or a group's
   * members. Everything after this point handles ordinary expressions only.
   */
  private expansionOf(expression: string): ExpandedExpression[] | CompileFailure {
    const cached = this.expansions.get(expression);
    if (cached) return cached;
    let result: ExpandedExpression[] | CompileFailure;
    if (!expression.includes(":(")) {
      // It can't be a group, so don't parse it twice.
      const source = expression.trim();
      result = [{ expression: source, span: { start: 0, end: source.length } }];
    } else {
      const parsed = parse(expression);
      result = parsed.ok
        ? expand(parsed.node)
        : { expression: expression.trim(), phase: "parse", error: parsed.error };
    }
    this.expansions.set(expression, result);
    return result;
  }

  /** Resolves one ordinary expression. Results are memoized for the life of the compiler. */
  resolve(expression: string): ResolveResult {
    const cached = this.cache.get(expression);
    if (cached) return cached;
    const result = this.resolveUncached(expression);
    this.cache.set(expression, result);
    return result;
  }

  private resolveUncached(expression: string): ResolveResult {
    const parsed = parse(expression);
    if (!parsed.ok) {
      return { ok: false, failure: { expression, phase: "parse", error: parsed.error } };
    }
    if (parsed.node.type === "group") {
      const error: ParseError = {
        code: "unexpected-group",
        message: "Expected a single utility, not a group. Expand the group first.",
        span: parsed.node.span,
      };
      return { ok: false, failure: { expression, phase: "parse", error } };
    }

    const { registry, theme } = this.context;
    const tokens = new Set<string>();
    const resolveContext: ResolveContext = {
      theme,
      useToken(scale, token) {
        tokens.add(tokenKey(scale, token));
        return `var(${tokenVariable(scale, token)})`;
      },
    };
    const resolved = registry.resolve(parsed.node, resolveContext);
    if (!resolved.ok) {
      return { ok: false, failure: { expression, phase: "resolve", error: resolved.error } };
    }

    let selectorTemplate = "&";
    const atRules: string[] = [];
    const breakpoints: number[] = [];
    const otherAtRules: number[] = [];
    const stateOrders: number[] = [];
    for (const variant of parsed.node.variants) {
      const definition = registry.getVariant(variant.name)!;
      if (definition.selector) {
        selectorTemplate = definition.selector.replaceAll("&", () => selectorTemplate);
        stateOrders.push(registry.variantOrder(variant.name));
      }
      if (definition.atRule) {
        atRules.push(definition.atRule);
        if (definition.breakpoint) breakpoints.push(definition.breakpoint.width);
        else otherAtRules.push(registry.variantOrder(variant.name));
      }
    }

    const selector = selectorTemplate.replaceAll("&", () => classSelector(parsed.node.source));
    return {
      ok: true,
      rule: {
        expression: parsed.node.source,
        classes: [parsed.node.source],
        selectors: [selector],
        selector,
        selectorTemplate,
        declarations: resolved.declarations,
        atRules,
        tokens: [...tokens],
        sort: {
          // Rules without at-rules first, then narrowest breakpoint up, then the rest.
          atRule:
            atRules.length === 0
              ? []
              : [
                  otherAtRules.length,
                  ...breakpoints.sort((a, b) => a - b),
                  ...otherAtRules.sort((a, b) => a - b),
                ],
          variants: stateOrders.sort((a, b) => b - a),
          utility: registry.utilityOrder(parsed.node.name),
        },
      },
    };
  }

  /** Compiles a set of expressions. Output depends only on the set, never on its order. */
  compile(inputs: Iterable<CompileInput>, options: CompileOptions = {}): CompileResult {
    const seen = new Set<string>();
    const locations = new Map<string, SourceLocation>();
    const found = new Map<string, CompiledRule>();
    // Only filled in for groups, so that plain expressions don't pay for them.
    const groupClasses = new Map<string, Set<string>>();
    const direct = new Set<string>();
    const failures: CompileFailure[] = [];

    for (const input of inputs) {
      const written = typeof input === "string" ? input : input.expression;
      const location = typeof input === "string" ? undefined : input.location;
      const expansion = this.expansionOf(written);
      const members = Array.isArray(expansion) ? expansion : [];

      for (const { expression, span } of members) {
        if (location && !locations.has(expression)) {
          locations.set(expression, { ...location, column: location.column + span.start });
        }
      }
      if (seen.has(written)) continue;
      seen.add(written);
      if (!Array.isArray(expansion)) failures.push(expansion);

      for (const { expression, span } of members) {
        const result = this.resolve(expression);
        const isDirect = expression === written.trim();
        if (result.ok) {
          found.set(expression, result.rule);
          if (isDirect) {
            direct.add(expression);
          } else {
            const classes = groupClasses.get(expression) ?? new Set();
            groupClasses.set(expression, classes.add(written.trim()));
          }
        } else if (isDirect || result.failure.phase === "parse") {
          failures.push(result.failure);
        } else {
          failures.push({ ...result.failure, group: { expression: written.trim(), span } });
        }
      }
    }
    const rules = [...found.values()].map((rule) => {
      const classes = groupClasses.get(rule.expression);
      if (!classes) return rule;
      if (direct.has(rule.expression)) classes.add(rule.expression);
      return withClasses(rule, classes);
    });
    rules.sort(compareRules);
    failures.sort((a, b) => {
      const left = failureKey(a);
      const right = failureKey(b);
      return left < right ? -1 : left > right ? 1 : 0;
    });

    const { css, mappings } = this.print(rules, locations, options);
    return {
      css,
      rules,
      failures,
      ...(options.sourceMap ? { map: encodeSourceMap(mappings, options.file), mappings } : {}),
    };
  }

  private print(
    rules: CompiledRule[],
    locations: Map<string, SourceLocation>,
    options: CompileOptions,
  ): { css: string; mappings: Mapping[] } {
    const minify = options.minify ?? false;
    const layers = new Set<CssLayer>(options.layers ?? ["theme", "utilities"]);
    const writer = new Writer();
    const mappings: Mapping[] = [];
    let empty = true;
    const separate = () => {
      if (!minify && !empty) writer.write("\n");
      empty = false;
    };

    if (layers.has("reset")) {
      separate();
      writer.write(RESET_CSS_FOR(minify));
    }

    if (layers.has("theme")) {
      const used = new Set(rules.flatMap((rule) => rule.tokens));
      const variables =
        options.variables === "none"
          ? []
          : themeVariables(this.context.theme, options.variables === "all" ? undefined : used);
      if (variables.length > 0) {
        separate();
        if (minify) {
          writer.write(`:root{${variables.map((v) => `${v.name}:${v.value}`).join(";")}}`);
        } else {
          writer.write(":root {\n");
          for (const variable of variables)
            writer.write(`  ${variable.name}: ${variable.value};\n`);
          writer.write("}\n");
        }
      }
    }

    if (layers.has("utilities")) {
      let index = 0;
      while (index < rules.length) {
        // Rules sharing the same at-rule stack are adjacent after sorting, so they share a block.
        const stack = rules[index]!.atRules;
        const key = stack.join("\0");
        let end = index;
        while (end < rules.length && rules[end]!.atRules.join("\0") === key) end++;
        const group = rules.slice(index, end);
        index = end;

        if (stack.length === 0) {
          for (const rule of group) {
            separate();
            this.printRule(writer, rule, "", minify, locations, mappings);
          }
        } else {
          separate();
          let indent = "";
          for (const atRule of stack) {
            const prelude = minify ? atRule.replace(/:\s+/g, ":") : atRule;
            writer.write(minify ? `${prelude}{` : `${indent}${prelude} {\n`);
            indent += "  ";
          }
          group.forEach((rule, position) => {
            if (!minify && position > 0) writer.write("\n");
            this.printRule(writer, rule, indent, minify, locations, mappings);
          });
          for (let depth = stack.length - 1; depth >= 0; depth--) {
            writer.write(minify ? "}" : `${"  ".repeat(depth)}}\n`);
          }
        }
      }
    }
    return { css: writer.text, mappings };
  }

  private printRule(
    writer: Writer,
    rule: CompiledRule,
    indent: string,
    minify: boolean,
    locations: Map<string, SourceLocation>,
    mappings: Mapping[],
  ): void {
    if (!minify) writer.write(indent);
    const location = locations.get(rule.expression);
    if (location) {
      mappings.push({
        generatedLine: writer.line,
        generatedColumn: writer.column,
        source: location.file,
        sourceLine: location.line,
        sourceColumn: location.column,
      });
    }
    if (minify) {
      const body = rule.declarations.map(([property, value]) => `${property}:${value}`).join(";");
      writer.write(`${rule.selectors.join(",")}{${body}}`);
    } else {
      writer.write(`${rule.selectors.join(`,\n${indent}`)} {\n`);
      for (const [property, value] of rule.declarations) {
        writer.write(`${indent}  ${property}: ${value};\n`);
      }
      writer.write(`${indent}}\n`);
    }
  }
}

const RESET_CSS_MINIFIED = RESET_CSS.replace(/\s*\n\s*/g, "")
  .replace(/\s*([{};,:])\s*/g, "$1")
  .replace(/;}/g, "}");

function RESET_CSS_FOR(minify: boolean): string {
  return minify ? RESET_CSS_MINIFIED : RESET_CSS;
}
