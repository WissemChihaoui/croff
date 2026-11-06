import type { CssLayer } from "@croff/compiler";

export interface Directive {
  /** Offset of the `@`. */
  start: number;
  /** Offset just after the terminating `;`. */
  end: number;
  /** The text between `@croff` and `;`, trimmed. */
  params: string;
}

export interface DirectiveError {
  message: string;
  params: string;
}

const LAYERS: Record<string, CssLayer[]> = {
  "": ["theme", "utilities"],
  reset: ["reset"],
  theme: ["theme"],
  utilities: ["utilities"],
};

/** Layers for a directive's parameters, or `undefined` if they are invalid. */
export function directiveLayers(params: string): CssLayer[] | undefined {
  return Object.hasOwn(LAYERS, params) ? LAYERS[params] : undefined;
}

/** Finds `@croff` directives, skipping comments and strings. */
export function findDirectives(css: string): Directive[] {
  const directives: Directive[] = [];
  let i = 0;
  while (i < css.length) {
    const ch = css[i]!;
    if (ch === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      i = end === -1 ? css.length : end + 2;
    } else if (ch === '"' || ch === "'") {
      let end = i + 1;
      while (end < css.length && css[end] !== ch) end += css[end] === "\\" ? 2 : 1;
      i = end + 1;
    } else if (ch === "\\") {
      i += 2;
    } else if (
      ch === "@" &&
      css.startsWith("@croff", i) &&
      !/[a-zA-Z0-9_-]/.test(css[i + 6] ?? "")
    ) {
      const semicolon = css.indexOf(";", i);
      const end = semicolon === -1 ? css.length : semicolon;
      directives.push({
        start: i,
        end: semicolon === -1 ? css.length : semicolon + 1,
        params: css.slice(i + 6, end).trim(),
      });
      i = semicolon === -1 ? css.length : semicolon + 1;
    } else {
      i++;
    }
  }
  return directives;
}

export function unknownDirective(params: string): DirectiveError {
  return {
    params,
    message: `Unknown directive "@croff ${params};". Use @croff; or @croff reset; or @croff theme; or @croff utilities;.`,
  };
}
