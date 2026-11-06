/** Escapes a string for use as a CSS identifier, following the CSSOM `CSS.escape` algorithm. */
export function escapeCssIdentifier(value: string): string {
  let out = "";
  const first = value.charCodeAt(0);
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code === 0) {
      out += "�";
    } else if (
      (code >= 0x01 && code <= 0x1f) ||
      code === 0x7f ||
      (i === 0 && code >= 0x30 && code <= 0x39) ||
      (i === 1 && code >= 0x30 && code <= 0x39 && first === 0x2d)
    ) {
      out += `\\${code.toString(16)} `;
    } else if (i === 0 && code === 0x2d && value.length === 1) {
      out += `\\${value[i]}`;
    } else if (
      code >= 0x80 ||
      code === 0x2d ||
      code === 0x5f ||
      (code >= 0x30 && code <= 0x39) ||
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a)
    ) {
      out += value[i];
    } else {
      out += `\\${value[i]}`;
    }
  }
  return out;
}

/** The class selector for an expression. */
export function classSelector(expression: string): string {
  return `.${escapeCssIdentifier(expression)}`;
}
