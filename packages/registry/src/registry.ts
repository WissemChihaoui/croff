import type { ArgumentNode, UtilityNode } from "@croff/parser";
import { isSafeCssValue, type ResolvedTheme } from "@croff/theme";
import { normalizeArbitraryValue } from "./arbitrary.js";
import { closest } from "./suggest.js";
import type {
  ResolveContext,
  ResolvedUtility,
  ResolveError,
  UtilityDefinition,
  ValueType,
  VariantDefinition,
} from "./types.js";
import { breakpointVariants, preferenceVariants, stateVariants } from "./variants.js";

const UTILITY_NAME = /^[a-z][a-z0-9-]*$/;
const VARIANT_NAME = /^[a-z0-9][a-z0-9-]*$/;
const PROPERTY_NAME = /^(--[a-zA-Z0-9_-]+|-?[a-zA-Z][a-zA-Z0-9-]*)$/;

export class RegistrationError extends Error {
  override name = "RegistrationError";
}

function argumentText(argument: ArgumentNode): string {
  if (argument.type === "word") return argument.value;
  return `${argument.name}(${argument.arguments.map(argumentText).join(",")})`;
}

function validateUtility(definition: UtilityDefinition): void {
  const { name, args, properties, compile, arbitrary } = definition;
  if (typeof name !== "string" || !UTILITY_NAME.test(name)) {
    throw new RegistrationError(
      `Invalid utility name ${JSON.stringify(name)}. Use lowercase words separated by hyphens.`,
    );
  }
  if (!properties?.length && !compile && !arbitrary) {
    throw new RegistrationError(`Utility "${name}" needs either "properties" or "compile".`);
  }
  if (properties?.length && compile) {
    throw new RegistrationError(`Utility "${name}" cannot have both "properties" and "compile".`);
  }
  if (!args && (arbitrary === false || (!arbitrary && !properties))) {
    throw new RegistrationError(`Utility "${name}" accepts neither a call nor a bracket value.`);
  }
  let seenOptional = false;
  for (const [index, argument] of (args ?? []).entries()) {
    if (argument.variadic && index !== args!.length - 1) {
      throw new RegistrationError(`Utility "${name}": only the last argument can be variadic.`);
    }
    if (argument.optional) seenOptional = true;
    else if (seenOptional) {
      throw new RegistrationError(
        `Utility "${name}": required argument "${argument.name}" cannot follow an optional one.`,
      );
    }
    if (!argument.types?.length) {
      throw new RegistrationError(`Utility "${name}": argument "${argument.name}" has no types.`);
    }
  }
}

/** Splits a selector at its top-level commas. */
function selectorList(selector: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote = "";
  let start = 0;
  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i]!;
    if (ch === "\\") i++;
    else if (quote) quote = ch === quote ? "" : quote;
    else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(selector.slice(start, i));
      start = i + 1;
    }
  }
  return [...parts, selector.slice(start)];
}

function validateVariant(definition: VariantDefinition): void {
  const { name, selector, atRule } = definition;
  if (typeof name !== "string" || !VARIANT_NAME.test(name)) {
    throw new RegistrationError(`Invalid variant name ${JSON.stringify(name)}.`);
  }
  if (!selector && !atRule) {
    throw new RegistrationError(`Variant "${name}" needs a "selector" or an "atRule".`);
  }
  // A part of a list without "&" would style elements that don't have the utility's class.
  if (selector && selectorList(selector).some((part) => !part.includes("&"))) {
    throw new RegistrationError(
      `Variant "${name}": selector ${JSON.stringify(selector)} must contain "&", in every part of a list.`,
    );
  }
  if (atRule && !atRule.startsWith("@")) {
    throw new RegistrationError(`Variant "${name}": atRule must start with "@".`);
  }
  for (const part of [selector, atRule]) {
    if (part && /[{};]/.test(part)) {
      throw new RegistrationError(`Variant "${name}" contains "{", "}" or ";".`);
    }
    if (part && !isSafeCssValue(part)) {
      throw new RegistrationError(
        `Variant "${name}": ${JSON.stringify(part)} has a comment or an unclosed bracket or string.`,
      );
    }
  }
}

export interface RegisterOptions {
  /** Replace an existing definition instead of failing. */
  override?: boolean;
}

/**
 * Holds utility and variant definitions and resolves parsed expressions against
 * them. Registration order is the cascade order of the generated CSS.
 *
 * @unstable The registry may change between 0.x releases.
 */
export class Registry {
  private readonly utilities = new Map<string, { definition: UtilityDefinition; order: number }>();
  private readonly variants = new Map<string, { definition: VariantDefinition; order: number }>();
  private nextUtility = 0;
  private nextVariant = 0;

  addUtility(definition: UtilityDefinition, options: RegisterOptions = {}): void {
    validateUtility(definition);
    const existing = this.utilities.get(definition.name);
    if (existing && !options.override) {
      throw new RegistrationError(
        `Utility "${definition.name}" is already registered. Pass override to replace it.`,
      );
    }
    this.utilities.set(definition.name, {
      definition,
      order: existing?.order ?? this.nextUtility++,
    });
  }

  addVariant(definition: VariantDefinition, options: RegisterOptions = {}): void {
    validateVariant(definition);
    const existing = this.variants.get(definition.name);
    if (existing && !options.override) {
      throw new RegistrationError(
        `Variant "${definition.name}" is already registered. Pass override to replace it.`,
      );
    }
    this.variants.set(definition.name, {
      definition,
      order: existing?.order ?? this.nextVariant++,
    });
  }

  getUtility(name: string): UtilityDefinition | undefined {
    return this.utilities.get(name)?.definition;
  }

  getVariant(name: string): VariantDefinition | undefined {
    return this.variants.get(name)?.definition;
  }

  /** Cascade position of a utility. */
  utilityOrder(name: string): number {
    return this.utilities.get(name)?.order ?? Number.MAX_SAFE_INTEGER;
  }

  /** Cascade position of a variant. */
  variantOrder(name: string): number {
    return this.variants.get(name)?.order ?? Number.MAX_SAFE_INTEGER;
  }

  listUtilities(): UtilityDefinition[] {
    return [...this.utilities.values()].map((entry) => entry.definition);
  }

  listVariants(): VariantDefinition[] {
    return [...this.variants.values()].map((entry) => entry.definition);
  }

  /** Turns a parsed expression into declarations. Variants are checked, but not applied. */
  resolve(node: UtilityNode, context: ResolveContext): ResolvedUtility {
    for (const variant of node.variants) {
      if (!this.variants.has(variant.name)) {
        const near = closest(variant.name, [...this.variants.keys()]);
        return failure({
          code: "unknown-variant",
          message: `Unknown variant "${variant.name}".`,
          ...(near ? { hint: `Did you mean "${near}"?` } : {}),
        });
      }
    }

    const pseudoElements = node.variants.filter((variant) =>
      this.variants.get(variant.name)?.definition.selector?.includes("::"),
    );
    if (pseudoElements.length > 1) {
      return failure({
        code: "conflicting-variants",
        message: `"${pseudoElements[0]!.name}:" and "${pseudoElements[1]!.name}:" can't be combined, because a selector can only target one pseudo-element.`,
      });
    }

    if (node.property) return resolveProperty(node);

    const definition = this.utilities.get(node.name)?.definition;
    if (!definition) {
      const near = closest(node.name, [...this.utilities.keys()]);
      return failure({
        code: "unknown-utility",
        message: `Unknown utility "${node.name}".`,
        ...(near
          ? {
              hint: `Did you mean "${near}"?`,
              suggestion: `${node.variants.map((v) => `${v.name}:`).join("")}${near}${node.source.slice(node.nameSpan.end)}`,
            }
          : node.arbitrary
            ? { hint: `To set any CSS property, write [${node.name}:${node.arbitrary.raw}].` }
            : {}),
      });
    }

    // Utilities can come from plugins, so one that throws only costs its own expression.
    let result: DeclarationResult;
    try {
      result = node.arbitrary
        ? resolveBracket(definition, node.arbitrary.value)
        : resolveCall(definition, node, context);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return failure({
        code: "utility-error",
        message: `${owner(definition)} failed on "${node.source}": ${reason}`,
      });
    }
    if ("error" in result) return failure(result.error);
    const unsafe = unsafeOutput(owner(definition), node, result.declarations);
    return unsafe
      ? failure(unsafe)
      : { ok: true, node, declarations: Object.entries(result.declarations) };
  }
}

function owner(definition: UtilityDefinition): string {
  const utility = `tility "${definition.name}"`;
  return definition.plugin ? `Plugin "${definition.plugin}": u${utility}` : `U${utility}`;
}

/** Checks declarations before they reach the stylesheet, where a bad one could break other rules. */
function unsafeOutput(
  source: string,
  node: UtilityNode,
  declarations: unknown,
): ResolveError | undefined {
  const problem = (detail: string): ResolveError => ({
    code: "unsafe-output",
    message: `${source} produced unusable CSS for "${node.source}": ${detail}`,
  });
  if (typeof declarations !== "object" || declarations === null) {
    return problem("expected an object of declarations.");
  }
  for (const [property, value] of Object.entries(declarations)) {
    if (!PROPERTY_NAME.test(property)) {
      return problem(`${JSON.stringify(property)} isn't a property name.`);
    }
    if (typeof value !== "string" || value.trim() === "" || !isSafeCssValue(value)) {
      return problem(`the value of ${property} isn't safe: ${JSON.stringify(value)}.`);
    }
  }
  return undefined;
}

function resolveProperty(node: UtilityNode): ResolvedUtility {
  const normalized = normalizeArbitraryValue(node.arbitrary!.value);
  if (!normalized.ok) return failure({ code: "unsafe-value", message: normalized.message });
  const declarations = { [node.name]: normalized.value };
  const unsafe = unsafeOutput("This property", node, declarations);
  return unsafe ? failure(unsafe) : { ok: true, node, declarations: Object.entries(declarations) };
}

function failure(error: ResolveError): ResolvedUtility {
  return { ok: false, error };
}

type DeclarationResult = { declarations: Record<string, string> } | { error: ResolveError };

function resolveBracket(definition: UtilityDefinition, value: string): DeclarationResult {
  const form =
    definition.arbitrary === false ? undefined : (definition.arbitrary ?? definition.properties);
  if (!form) {
    return {
      error: {
        code: "bracket-not-supported",
        message: `"${definition.name}" does not accept a bracket value.`,
        hint: `Use ${definition.name}(...) with one of its documented values.`,
      },
    };
  }
  const normalized = normalizeArbitraryValue(value);
  if (!normalized.ok) return { error: { code: "unsafe-value", message: normalized.message } };
  if (typeof form === "function") return { declarations: form(normalized.value) };
  return {
    declarations: Object.fromEntries(form.map((property) => [property, normalized.value])),
  };
}

function expectedList(types: ValueType[], theme: ResolvedTheme): string {
  const parts = types.map((type) => {
    const { label, values } = type.describe(theme);
    if (values?.length && values.length <= 6) return values.join(", ");
    return label;
  });
  return parts.join("; ");
}

function allowedWords(types: ValueType[], theme: ResolvedTheme): string[] {
  return types.flatMap((type) => type.describe(theme).values ?? []);
}

function resolveCall(
  definition: UtilityDefinition,
  node: UtilityNode,
  context: ResolveContext,
): DeclarationResult {
  const specs = definition.args;
  if (!specs) {
    return {
      error: {
        code: "call-not-supported",
        message: `"${definition.name}" only accepts a bracket value.`,
        hint: `Write ${definition.name}[...].`,
      },
    };
  }

  const required = specs.filter((spec) => !spec.optional).length;
  const variadic = specs.at(-1)?.variadic === true;
  const given = node.arguments;

  if (given.length < required) {
    const missing = specs[given.length]!;
    return {
      error: {
        code: "missing-argument",
        message: `"${definition.name}" needs a value for "${missing.name}".`,
        hint: `Expected ${expectedList(missing.types, context.theme)}.`,
      },
    };
  }
  if (!variadic && given.length > specs.length) {
    return {
      error: {
        code: "too-many-arguments",
        message: `"${definition.name}" takes at most ${specs.length} argument${specs.length === 1 ? "" : "s"}, got ${given.length}.`,
      },
    };
  }

  const args: string[] = [];
  const words: string[] = [];
  for (const [index, argument] of given.entries()) {
    const spec = specs[Math.min(index, specs.length - 1)]!;
    let resolved: string | undefined;
    for (const type of spec.types) {
      resolved = type.resolve(argument, context);
      if (resolved !== undefined) break;
    }
    if (resolved === undefined) {
      const text = argumentText(argument);
      const near = closest(text, allowedWords(spec.types, context.theme));
      return {
        error: {
          code: "invalid-argument",
          message: `"${text}" is not a valid ${spec.name} for "${definition.name}". Expected ${expectedList(spec.types, context.theme)}.`,
          hint: near
            ? `Did you mean "${near}"?`
            : looksLikeRawCss(text)
              ? `For a raw CSS value use brackets: ${definition.name}[${text}].`
              : `For a raw CSS value use brackets: ${definition.name}[...].`,
          ...(near
            ? {
                suggestion: `${node.variants.map((v) => `${v.name}:`).join("")}${definition.name}(${near})`,
              }
            : {}),
        },
      };
    }
    args.push(resolved);
    words.push(argumentText(argument));
  }

  if (definition.compile) {
    return { declarations: definition.compile({ args, words, context }) };
  }
  const value = args[0];
  if (value === undefined) {
    return {
      error: {
        code: "missing-argument",
        message: `"${definition.name}" needs a value.`,
      },
    };
  }
  return {
    declarations: Object.fromEntries((definition.properties ?? []).map((p) => [p, value])),
  };
}

function looksLikeRawCss(text: string): boolean {
  return /^-?[\d.]+[a-z%]*$/.test(text) || text.startsWith("#");
}

/** Creates a registry from utility definitions, plus the built-in variants for a theme. */
export function buildRegistry(theme: ResolvedTheme, utilities: UtilityDefinition[]): Registry {
  const registry = new Registry();
  for (const utility of utilities) registry.addUtility(utility);
  for (const variant of stateVariants) registry.addVariant(variant);
  for (const variant of breakpointVariants(theme)) registry.addVariant(variant);
  for (const variant of preferenceVariants) registry.addVariant(variant);
  return registry;
}
