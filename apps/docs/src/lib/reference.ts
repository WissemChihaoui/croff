import type { Croff, ResolvedTheme, UtilityDefinition } from "@croff/core";

export interface ReferenceType {
  label: string;
  values?: string[];
}

export interface ReferenceArgument {
  name: string;
  optional: boolean;
  variadic: boolean;
  types: ReferenceType[];
}

/** Whether a utility accepts the bracket form. Mirrors the registry's rule. */
export function acceptsBracket(utility: UtilityDefinition): boolean {
  return utility.arbitrary !== false && Boolean(utility.arbitrary ?? utility.properties);
}

/** The forms a utility can be written in. */
export function signatures(utility: UtilityDefinition): string[] {
  const forms: string[] = [];
  if (utility.args) {
    const required = utility.args
      .filter((arg) => !arg.optional)
      .map((arg) => arg.name + (arg.variadic ? ",…" : ""));
    const optional = utility.args.filter((arg) => arg.optional).map((arg) => arg.name);
    if (optional.length > 0) {
      const parts = [...required];
      for (const name of [undefined, ...optional]) {
        if (name) parts.push(name);
        if (parts.length > 0 || required.length === 0)
          forms.push(`${utility.name}(${parts.join(",")})`);
      }
    } else {
      forms.push(`${utility.name}(${required.join(",")})`);
    }
  }
  if (acceptsBracket(utility)) forms.push(`${utility.name}[raw-css]`);
  return forms;
}

export function describeArguments(
  utility: UtilityDefinition,
  theme: ResolvedTheme,
): ReferenceArgument[] {
  return (
    (utility.args ?? [])
      .map((arg) => ({
        name: arg.name,
        optional: arg.optional ?? false,
        variadic: arg.variadic ?? false,
        types: arg.types.map((type) => {
          const { label, values } = type.describe(theme);
          return { label, ...(values ? { values } : {}) };
        }),
      }))
      // padding(value,value2,value3,value4) repeats one type: one row is enough.
      .filter((arg) => !/^value\d$/.test(arg.name))
  );
}

/** The theme scales a utility reads from. */
export function themeScales(utility: UtilityDefinition, theme: ResolvedTheme): string[] {
  const scales = new Set<string>();
  for (const arg of utility.args ?? []) {
    for (const type of arg.types) {
      const { scale } = type.describe(theme);
      if (scale) scales.add(scale);
    }
  }
  return [...scales];
}

/** Compiles expressions with the real engine. Theme variables are omitted for focus. */
export function generatedCss(engine: Croff, expressions: string[]): string {
  const { css, failures } = engine.compile(expressions, {
    variables: "none",
    layers: ["utilities"],
  });
  if (failures.length > 0) {
    throw new Error(`Invalid example: ${failures.map((failure) => failure.expression).join(", ")}`);
  }
  return css.trimEnd();
}

/** Derives responsive and state usage from the utility's first plain example. */
export function usageExamples(utility: UtilityDefinition): string[] {
  const plain = utility.examples.find((example) => !example.includes(":")) ?? utility.examples[0]!;
  return [`md:${plain}`, `hover:${plain}`, `lg:focus:${plain}`];
}

export function breakpointVariantList(theme: ResolvedTheme): { name: string; atRule: string }[] {
  return Object.entries(theme.scales["breakpoints"] ?? {}).map(([name, value]) => ({
    name,
    atRule: `@media (min-width: ${value})`,
  }));
}
