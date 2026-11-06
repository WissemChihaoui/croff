import type { UtilityDefinition, ValueType } from "../types.js";

interface SimpleUtility extends Omit<UtilityDefinition, "args" | "properties"> {
  properties: string[];
  types: ValueType[];
  argName?: string;
}

/** A utility with one required value, applied to one or more properties. */
export function simple({ types, argName = "value", ...rest }: SimpleUtility): UtilityDefinition {
  return { ...rest, args: [{ name: argName, types }] };
}

/** Expands 1–4 positional values into CSS's top/right/bottom/left shorthand order. */
export function shorthand(values: string[]): string {
  return values.join(" ");
}
