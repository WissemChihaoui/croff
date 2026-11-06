/**
 * Minifies CSS conservatively: removes comments and collapses whitespace, never
 * touching strings or `url()`. Used on stylesheets containing hand-written CSS
 * around the `@croff` directive; generated rules are printed compactly directly.
 */
export function minifyCss(css: string): string {
  let out = "";
  let i = 0;
  let pendingSpace = false;

  const flushSpace = (next: string) => {
    if (
      pendingSpace &&
      out.length > 0 &&
      !"{};,".includes(next) &&
      !"{};,:".includes(out.at(-1)!)
    ) {
      out += " ";
    }
    pendingSpace = false;
  };

  while (i < css.length) {
    const ch = css[i]!;
    if (ch === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      i = end === -1 ? css.length : end + 2;
      pendingSpace = true;
    } else if (ch === '"' || ch === "'") {
      flushSpace(ch);
      let end = i + 1;
      while (end < css.length && css[end] !== ch) end += css[end] === "\\" ? 2 : 1;
      out += css.slice(i, end + 1);
      i = end + 1;
    } else if (css.startsWith("url(", i)) {
      flushSpace("u");
      const end = css.indexOf(")", i);
      const stop = end === -1 ? css.length : end + 1;
      out += css.slice(i, stop);
      i = stop;
    } else if (ch === "\\") {
      flushSpace(ch);
      out += css.slice(i, i + 2);
      i += 2;
    } else if (ch === " " || ch === "\n" || ch === "\t" || ch === "\r" || ch === "\f") {
      pendingSpace = true;
      i++;
    } else {
      flushSpace(ch);
      if (ch === "}" && out.endsWith(";")) out = out.slice(0, -1);
      out += ch;
      i++;
    }
  }
  return out;
}
