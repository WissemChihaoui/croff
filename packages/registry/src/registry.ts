import type { ArgumentNode, UtilityNode } from "@croff/parser";
import type { ResolvedTheme } from "@croff/theme";
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
import { breakpointVariants, stateVariants } from "./variants.js";

const UTILITY_NAME = /^[a-z][a-z0-9-]*$/;
const VARIANT_NAME = /^[a-z0-9][a-z0-9-]*$/;

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

function validateVariant(definition: VariantDefinition): void {
  const { name, selector, atRule } = definition;
  if (typeof name !== "string" || !VARIANT_NAME.test(name)) {
    throw new RegistrationError(`Invalid variant name ${JSON.stringify(name)}.`);
  }
  if (!selector && !atRule) {
    throw new RegistrationError(`Variant "${name}" needs a "selector" or an "atRule".`);
  }
  if (selector && !selector.includes("&")) {
    throw new RegistrationError(
      `Variant "${name}": selector ${JSON.stringify(selector)} must contain "&".`,
    );
  }
  if (atRule && !atRule.startsWith("@")) {
    throw new RegistrationError(`Variant "${name}": atRule must start with "@".`);
  }
  for (const part of [selector, atRule]) {
    if (part && /[{};]/.test(part)) {
      throw new RegistrationError(`Variant "${name}" contains "{", "}" or ";".`);
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
          : {}),
      });
    }

    const result = node.arbitrary
      ? resolveBracket(definition, node.arbitrary.value)
      : resolveCall(definition, node, context);
    return "error" in result
      ? failure(result.error)
      : { ok: true, node, declarations: Object.entries(result.declarations) };
  }
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
  return registry;
}
