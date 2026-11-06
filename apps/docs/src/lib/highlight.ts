/**
 * A small syntax highlighter that knows CROFF expressions. It runs at build time
 * for Markdown and in the browser for live panes. It only ever colors text, so
 * approximate tokenization is fine here, unlike in the real parser.
 */

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (ch) => ESCAPES[ch]!);
}

const span = (kind: string, text: string) => `<span class="t-${kind}">${escapeHtml(text)}</span>`;

const EXPRESSION = /^((?:[a-z0-9][a-z0-9-]*:)*)([a-z][a-z0-9-]*)([([])(.*)([)\]])$/s;

const GROUP = /^((?:[a-z0-9][a-z0-9-]*:)+)\((.*)\)$/s;

/** Splits on commas that aren't inside brackets or quotes. */
function splitMembers(text: string): string[] {
  const members: string[] = [];
  let depth = 0;
  let quote = "";
  let current = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === "\\") {
      current += ch + (text[++i] ?? "");
      continue;
    }
    if (quote) {
      if (ch === quote) quote = "";
    } else if (ch === "'" || ch === '"') {
      quote = ch;
    } else if (ch === "(" || ch === "[") {
      depth++;
    } else if (ch === ")" || ch === "]") {
      depth--;
    } else if (ch === "," && depth === 0) {
      members.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  members.push(current);
  return members;
}

function highlightVariants(variants: string): string {
  return variants
    .split(":")
    .filter(Boolean)
    .map((variant) => `${span("variant", variant)}${span("punct", ":")}`)
    .join("");
}

/** Colors one expression: variants, utility name, value. Groups color each member. */
export function highlightExpression(text: string): string {
  const group = GROUP.exec(text);
  if (group) {
    const members = splitMembers(group[2]!).map(highlightExpression).join(span("punct", ","));
    return `${highlightVariants(group[1]!)}${span("punct", "(")}${members}${span("punct", ")")}`;
  }
  const match = EXPRESSION.exec(text);
  if (!match) return span("string", text);
  const [, variants, name, open, inner, close] = match;
  const prefix = highlightVariants(variants!);
  const kind = open === "[" ? "raw" : "arg";
  return `${prefix}${span("utility", name!)}${span("punct", open!)}${inner ? span(kind, inner) : ""}${span("punct", close!)}`;
}

function highlightClassList(value: string): string {
  return value
    .split(/(\s+)/)
    .map((part) => (/^\s*$/.test(part) ? part : highlightExpression(part)))
    .join("");
}

function highlightQuoted(text: string): string {
  const quote = text[0]!;
  const end = text.at(-1) === quote ? -1 : undefined;
  const inner = text.slice(1, end);
  return `${span("string", quote)}${highlightClassList(inner)}${end ? span("string", quote) : ""}`;
}

/** Whether a string's content looks like class names and not prose. */
function hasExpression(text: string): boolean {
  return text.split(/\s+/).some((part) => GROUP.test(part) || EXPRESSION.test(part));
}

function tokenize(code: string, rules: [RegExp, (match: RegExpExecArray) => string][]): string {
  let out = "";
  let i = 0;
  while (i < code.length) {
    let matched = false;
    for (const [regex, render] of rules) {
      regex.lastIndex = i;
      const match = regex.exec(code);
      if (match && match[0].length > 0) {
        out += render(match);
        i += match[0].length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out += escapeHtml(code[i]!);
      i++;
    }
  }
  return out;
}

const HTML_RULES: [RegExp, (m: RegExpExecArray) => string][] = [
  [/<!--[\s\S]*?-->/y, (m) => span("comment", m[0])],
  [/<!doctype[^>]*>/iy, (m) => span("comment", m[0])],
  [/<\/?[a-zA-Z][\w:-]*|\/?>/y, (m) => span("tag", m[0])],
  [
    /([:@\w-]*(?:class|className))(=)("[^"]*"|'[^']*')/y,
    (m) => `${span("attr", m[1]!)}${span("punct", m[2]!)}${highlightQuoted(m[3]!)}`,
  ],
  [
    /([:@\w-]+)(=)("[^"]*"|'[^']*')/y,
    (m) => `${span("attr", m[1]!)}${span("punct", m[2]!)}${span("string", m[3]!)}`,
  ],
];

function highlightHtml(code: string): string {
  // Only highlight attributes inside tags; plain text stays plain.
  let out = "";
  let i = 0;
  const tag = /<(!--|!doctype|\/?[a-zA-Z])/gi;
  for (let match = tag.exec(code); match; match = tag.exec(code)) {
    out += escapeHtml(code.slice(i, match.index));
    let end: number;
    if (match[1] === "!--") {
      const close = code.indexOf("-->", match.index);
      end = close === -1 ? code.length : close + 3;
    } else {
      end = tagEnd(code, match.index);
    }
    out += tokenize(code.slice(match.index, end), HTML_RULES);
    i = end;
    tag.lastIndex = end;
  }
  return out + escapeHtml(code.slice(i));
}

function tagEnd(code: string, start: number): number {
  let quote = "";
  for (let i = start; i < code.length; i++) {
    const ch = code[i]!;
    if (quote) {
      if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === ">") {
      return i + 1;
    }
  }
  return code.length;
}

const JS_KEYWORDS =
  "import|from|export|default|const|let|var|function|return|if|else|for|of|in|new|class|extends|type|interface|async|await|as|true|false|null|undefined|typeof|satisfies|switch|case|break|throw|try|catch";

const JS_RULES: [RegExp, (m: RegExpExecArray) => string][] = [
  [/\/\/[^\n]*|\/\*[\s\S]*?\*\//y, (m) => span("comment", m[0])],
  [
    /(class|className)(=)("[^"]*"|'[^']*')/y,
    (m) => `${span("attr", m[1]!)}${span("punct", m[2]!)}${highlightQuoted(m[3]!)}`,
  ],
  [
    /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/y,
    (m) => (hasExpression(m[0].slice(1, -1)) ? highlightQuoted(m[0]) : span("string", m[0])),
  ],
  [/<\/?[A-Za-z][\w.]*(?=[\s/>])|\/>/y, (m) => span("tag", m[0])],
  [new RegExp(`\\b(?:${JS_KEYWORDS})\\b`, "y"), (m) => span("keyword", m[0])],
  [/\b\d[\d_.]*\b/y, (m) => span("number", m[0])],
  [/\b[a-zA-Z_$][\w$]*(?=\()/y, (m) => span("function", m[0])],
  [/[a-zA-Z_$][\w$]*/y, (m) => escapeHtml(m[0])],
];

function highlightCss(code: string): string {
  let out = "";
  let i = 0;
  let depth = 0;
  const rule = /\/\*[\s\S]*?\*\/|"[^"]*"|'[^']*'|@[\w-]+|[{};]/y;
  let buffer = "";
  const flush = () => {
    if (!buffer) return;
    const inDeclaration = depth > 0 && /:/.test(buffer) && !/^\s*[.&#:]/.test(buffer);
    if (inDeclaration) {
      const colon = buffer.indexOf(":");
      const before = buffer.slice(0, colon);
      const after = buffer.slice(colon + 1);
      const leading = /^\s*/.exec(before)![0];
      out +=
        leading +
        span("attr", before.slice(leading.length)) +
        span("punct", ":") +
        after.replace(/[^\s]+/g, (word) => span("string", word));
    } else if (buffer.trim()) {
      const leading = /^\s*/.exec(buffer)![0];
      const trailing = /\s*$/.exec(buffer)![0];
      const body = buffer.slice(leading.length, buffer.length - trailing.length);
      out += leading + span("selector", body) + trailing;
    } else {
      out += buffer;
    }
    buffer = "";
  };
  while (i < code.length) {
    rule.lastIndex = i;
    const match = rule.exec(code);
    if (match) {
      const text = match[0];
      if (text.startsWith("/*")) {
        flush();
        out += span("comment", text);
      } else if (text.startsWith("@")) {
        flush();
        out += span("keyword", text);
      } else if (text === "{" || text === "}" || text === ";") {
        flush();
        if (text === "{") depth++;
        if (text === "}") depth--;
        out += span("punct", text);
      } else {
        buffer += text;
      }
      i += text.length;
    } else {
      buffer += code[i];
      i++;
    }
  }
  flush();
  return out;
}

function highlightBash(code: string): string {
  return code
    .split("\n")
    .map((line) => {
      if (/^\s*#/.test(line)) return span("comment", line);
      let first = true;
      return line.replace(/\S+/g, (word) => {
        if (first) {
          first = false;
          return span(word === "$" ? "punct" : "function", word);
        }
        if (word.startsWith("-")) return span("attr", word);
        if (/^["']/.test(word)) return span("string", word);
        return escapeHtml(word);
      });
    })
    .join("\n");
}

const JSON_RULES: [RegExp, (m: RegExpExecArray) => string][] = [
  [/"(?:[^"\\]|\\.)*"(?=\s*:)/y, (m) => span("attr", m[0])],
  [/"(?:[^"\\]|\\.)*"/y, (m) => span("string", m[0])],
  [/-?\d+(?:\.\d+)?|\btrue\b|\bfalse\b|\bnull\b/y, (m) => span("number", m[0])],
];

/** Returns highlighted HTML for a code sample. Unknown languages are escaped only. */
export function highlight(code: string, language: string): string {
  switch (language) {
    case "html":
    case "vue":
      return highlightHtml(code);
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
    case "mjs":
      return tokenize(code, JS_RULES);
    case "css":
      return highlightCss(code);
    case "bash":
    case "sh":
      return highlightBash(code);
    case "json":
      return tokenize(code, JSON_RULES);
    case "croff":
      return code
        .split("\n")
        .map((line) => highlightClassList(line))
        .join("\n");
    default:
      return escapeHtml(code);
  }
}
