import { parse, type ParseError } from "@croff/parser";
import type { Registry, ResolveContext, ResolveError, VariantDefinition } from "@croff/registry";
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
  expression: string;
  selector: string;
  declarations: [property: string, value: string][];
  atRules: string[];
  /** `scale/token` keys this rule depends on. */
  tokens: string[];
  sort: { atRule: number[]; variants: number[]; utility: number };
}

export type CompileFailure =
  | { expression: string; phase: "parse"; error: ParseError }
  | { expression: string; phase: "resolve"; error: ResolveError };

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

  constructor(private readonly context: CompilerContext) {}

  /** Resolves one expression. Results are memoized for the life of the compiler. */
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

    let selector = classSelector(parsed.node.source);
    const atRules: string[] = [];
    const breakpoints: number[] = [];
    const otherAtRules: number[] = [];
    const stateOrders: number[] = [];
    const definitions = parsed.node.variants.map((variant) => registry.getVariant(variant.name)!);
    // A pseudo-element has to end the selector, wherever it was written.
    const isPseudoElement = (definition: VariantDefinition) => definition.selector?.includes("::");
    const inOrder = [
      ...definitions.filter((definition) => !isPseudoElement(definition)),
      ...definitions.filter(isPseudoElement),
    ];
    for (const definition of inOrder) {
      if (definition.selector) {
        selector = definition.selector.replaceAll("&", () => selector);
        stateOrders.push(registry.variantOrder(definition.name));
      }
      if (definition.atRule) {
        atRules.push(definition.atRule);
        if (definition.breakpoint) breakpoints.push(definition.breakpoint.width);
        else otherAtRules.push(registry.variantOrder(definition.name));
      }
    }
    const declared = new Set(resolved.declarations.map(([property]) => property));
    const added = definitions
      .flatMap((definition) => Object.entries(definition.declarations ?? {}))
      .filter(([property]) => !declared.has(property));

    return {
      ok: true,
      rule: {
        expression: parsed.node.source,
        selector,
        declarations: [...added, ...resolved.declarations],
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
          // An arbitrary property comes last, so that it wins an equal contest with a utility.
          utility: parsed.node.property
            ? Number.MAX_SAFE_INTEGER
            : registry.utilityOrder(parsed.node.name),
        },
      },
    };
  }

  /** Compiles a set of expressions. Output depends only on the set, never on its order. */
  compile(inputs: Iterable<CompileInput>, options: CompileOptions = {}): CompileResult {
    const seen = new Set<string>();
    const locations = new Map<string, SourceLocation>();
    const rules: CompiledRule[] = [];
    const failures: CompileFailure[] = [];

    for (const input of inputs) {
      const expression = typeof input === "string" ? input : input.expression;
      const location = typeof input === "string" ? undefined : input.location;
      if (location && !locations.has(expression)) locations.set(expression, location);
      if (seen.has(expression)) continue;
      seen.add(expression);
      const result = this.resolve(expression);
      if (result.ok) rules.push(result.rule);
      else failures.push(result.failure);
    }
    rules.sort(compareRules);
    failures.sort((a, b) => (a.expression < b.expression ? -1 : 1));

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
      writer.write(`${rule.selector}{${body}}`);
    } else {
      writer.write(`${rule.selector} {\n`);
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
