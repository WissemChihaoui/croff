import { createCroff } from "@croff/core";
import { extractCandidates } from "@croff/scanner/extract";
import { Marked, type Tokens } from "marked";
import { escapeHtml, highlight } from "./highlight.ts";

export interface Heading {
  id: string;
  text: string;
  level: number;
}

export interface DocPageData {
  title: string;
  description: string;
  html: string;
  headings: Heading[];
}

/** Text gathered for search: one entry per section of a page. */
export interface PageSection {
  heading: string;
  id: string;
  text: string;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function parseFrontmatter(source: string): {
  data: Record<string, string>;
  body: string;
} {
  // Some Windows editors start a file with a byte order mark.
  const match = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!match) return { data: {}, body: source };
  const data: Record<string, string> = {};
  for (const line of match[1]!.split(/\r?\n/)) {
    const colon = line.indexOf(":");
    if (colon > 0) data[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  return { data, body: source.slice(match[0].length) };
}

// Includes the custom tokens that the theming pages define in their examples.
const engine = createCroff({
  theme: {
    colors: { accent: "#ff5c00", slate: { 100: "#f1f5f9", 900: "#0f172a" } },
    spacing: { 7: "1.75rem" },
  },
});

/**
 * The CSS CROFF generates for the expressions in a sample, using the real
 * compiler. An invalid sample fails the build, so the docs can't show one.
 */
export function compileSample(code: string): string {
  const { candidates } = extractCandidates(code);
  const { css, failures } = engine.compile(candidates.map((c) => c.expression));
  if (failures.length > 0) {
    const list = failures.map((failure) => `${failure.expression}: ${failure.error.message}`);
    throw new Error(`Invalid sample in the documentation:\n${list.join("\n")}`);
  }
  return css.trimEnd();
}

export function codeBlock(code: string, language: string, label?: string): string {
  return `<div class="code-block"><div class="code-head"><span>${escapeHtml(label ?? language)}</span><button type="button" class="code-copy" data-copy>Copy</button></div><pre tabindex="0"><code>${highlight(code, language)}</code></pre></div>`;
}

export function renderMarkdown(source: string): DocPageData {
  const { data, body } = parseFrontmatter(source);
  const headings: Heading[] = [];
  const used = new Map<string, number>();
  const marked = new Marked({
    gfm: true,
    renderer: {
      heading(
        this: { parser: { parseInline(tokens: Tokens.Heading["tokens"]): string } },
        token: Tokens.Heading,
      ) {
        const inner = this.parser.parseInline(token.tokens);
        const base = slugify(token.text);
        const count = used.get(base) ?? 0;
        used.set(base, count + 1);
        const id = count === 0 ? base : `${base}-${count}`;
        const text = inner.replace(/<[^>]+>/g, "");
        if (token.depth === 2 || token.depth === 3) {
          headings.push({ id, text, level: token.depth });
        }
        return `<h${token.depth} id="${id}"><a class="anchor" href="#${id}">${inner}</a></h${token.depth}>\n`;
      },
      code(token: Tokens.Code) {
        const [language = "text", ...meta] = (token.lang ?? "text").split(/\s+/);
        const block = codeBlock(token.text, language);
        if (meta.includes("compile")) {
          // The output below a sample is produced by the compiler, so it can't drift.
          return `${block}${codeBlock(compileSample(token.text), "css", "Generated CSS")}`;
        }
        return block;
      },
      table(this: { parser: unknown }, token: Tokens.Table) {
        const parser = this.parser as { parseInline(tokens: Tokens.TableCell["tokens"]): string };
        const head = token.header
          .map((cell) => `<th>${parser.parseInline(cell.tokens)}</th>`)
          .join("");
        const rows = token.rows
          .map(
            (row) =>
              `<tr>${row.map((cell) => `<td>${parser.parseInline(cell.tokens)}</td>`).join("")}</tr>`,
          )
          .join("");
        return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
      },
    },
  });
  const html = marked.parse(body, { async: false });
  return {
    title: data["title"] ?? "Untitled",
    description: data["description"] ?? "",
    html,
    headings,
  };
}

/** Splits a page into sections for the search index. Includes code, for finding examples. */
export function pageSections(source: string): PageSection[] {
  const { body } = parseFrontmatter(source);
  const sections: PageSection[] = [{ heading: "", id: "", text: "" }];
  const used = new Map<string, number>();
  let inFence = false;
  for (const line of body.split(/\r?\n/)) {
    if (line.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    const heading = !inFence && /^(#{2,4})\s+(.*)$/.exec(line);
    if (heading) {
      const text = heading[2]!.replace(/`/g, "");
      const base = slugify(text);
      const count = used.get(base) ?? 0;
      used.set(base, count + 1);
      sections.push({ heading: text, id: count === 0 ? base : `${base}-${count}`, text: "" });
    } else if (line.trim()) {
      sections.at(-1)!.text += `${line
        .replace(/[*_`|#>]/g, " ")
        .replace(/\s+/g, " ")
        .trim()} `;
    }
  }
  return sections.filter((section) => section.heading || section.text);
}
