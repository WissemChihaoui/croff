import { isSafeCssValue } from "@croffcss/theme";

const MATH_FUNCTIONS = new Set(["calc", "min", "max", "clamp"]);

function isDigit(ch: string | undefined): boolean {
  return ch !== undefined && ch >= "0" && ch <= "9";
}

function isIdentStart(ch: string | undefined): boolean {
  return ch !== undefined && /[a-zA-Z_]/.test(ch);
}

/** Copies a parenthesized group verbatim, returning the index after its closing paren. */
function skipGroup(value: string, open: number): number {
  let depth = 0;
  for (let i = open; i < value.length; i++) {
    if (value[i] === "(") depth++;
    else if (value[i] === ")" && --depth === 0) return i + 1;
  }
  return value.length;
}

/**
 * CSS requires spaces around `+` and `-` in math functions, but class names
 * cannot contain them. This reinserts them, walking the value so that hyphens
 * in identifiers and custom properties are never touched.
 */
export function spaceMathOperators(value: string): string {
  let out = "";
  let i = 0;
  // Whether each open paren is a math context.
  const stack: boolean[] = [];
  // Whether the previous token ended a value, making the next +/- binary.
  let afterValue = false;

  while (i < value.length) {
    const ch = value[i]!;
    const inMath = stack.at(-1) === true;

    if (ch === "'" || ch === '"') {
      let end = i + 1;
      while (end < value.length && value[end] !== ch) end += value[end] === "\\" ? 2 : 1;
      out += value.slice(i, end + 1);
      i = end + 1;
      afterValue = true;
    } else if (isIdentStart(ch) || (ch === "-" && value[i + 1] === "-")) {
      let end = i;
      while (end < value.length && /[a-zA-Z0-9_-]/.test(value[end]!)) end++;
      const name = value.slice(i, end);
      out += name;
      i = end;
      if (value[i] === "(") {
        if (MATH_FUNCTIONS.has(name.toLowerCase())) {
          stack.push(true);
          out += "(";
          i++;
          afterValue = false;
        } else if (inMath) {
          // A non-math function such as var() inside calc(): its contents are opaque.
          const close = skipGroup(value, i);
          out += value.slice(i, close);
          i = close;
          afterValue = true;
        } else {
          stack.push(false);
          out += "(";
          i++;
          afterValue = false;
        }
      } else {
        afterValue = true;
      }
    } else if (isDigit(ch) || (ch === "." && isDigit(value[i + 1]))) {
      let end = i;
      while (isDigit(value[end]) || value[end] === ".") end++;
      if ((value[end] === "e" || value[end] === "E") && isDigit(value[end + 1])) {
        end += 1;
        while (isDigit(value[end])) end++;
      } else if (
        (value[end] === "e" || value[end] === "E") &&
        (value[end + 1] === "-" || value[end + 1] === "+") &&
        isDigit(value[end + 2])
      ) {
        end += 2;
        while (isDigit(value[end])) end++;
      }
      while (end < value.length && /[a-zA-Z%]/.test(value[end]!)) end++;
      out += value.slice(i, end);
      i = end;
      afterValue = true;
    } else if ((ch === "+" || ch === "-") && inMath && afterValue) {
      if (!out.endsWith(" ")) out += " ";
      out += ch;
      i++;
      if (value[i] !== " ") out += " ";
      afterValue = false;
    } else if (ch === "(") {
      stack.push(inMath);
      out += ch;
      i++;
      afterValue = false;
    } else if (ch === ")") {
      stack.pop();
      out += ch;
      i++;
      afterValue = true;
    } else {
      out += ch;
      i++;
      if (ch !== " ") afterValue = false;
    }
  }
  return out;
}

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
