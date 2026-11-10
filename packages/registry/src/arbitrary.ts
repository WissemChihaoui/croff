import { isSafeCssValue, spaceMathOperators } from "@croffcss/theme";

export type ArbitraryResult = { ok: true; value: string } | { ok: false; message: string };

/** Sanity-checks and normalizes a decoded bracket value for use in a declaration. */
export function normalizeArbitraryValue(value: string): ArbitraryResult {
  if (!isSafeCssValue(value)) {
    return {
      ok: false,
      message: `The bracket value ${JSON.stringify(value)} could break the rest of the stylesheet. It can't contain "{", "}", "/*" or "</" outside a string, or ";" outside a function, and its brackets and quotes must balance.`,
    };
  }
  return { ok: true, value: spaceMathOperators(value) };
}
