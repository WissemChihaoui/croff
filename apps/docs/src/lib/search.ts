export interface SearchEntry {
  /** Page title, or utility name. */
  title: string;
  /** Section heading within the page, if any. */
  heading: string;
  /** Sidebar section, e.g. "Core Concepts". */
  group: string;
  path: string;
  text: string;
  kind: "page" | "section" | "utility" | "variant";
}

export interface SearchResult {
  entry: SearchEntry;
  score: number;
  snippet: string;
}

function snippetFor(text: string, terms: string[]): string {
  const lower = text.toLowerCase();
  let at = -1;
  for (const term of terms) {
    at = lower.indexOf(term);
    if (at !== -1) break;
  }
  if (at === -1) return text.slice(0, 110);
  const start = Math.max(0, at - 30);
  const slice = text.slice(start, start + 120).trim();
  return `${start > 0 ? "…" : ""}${slice}${start + 120 < text.length ? "…" : ""}`;
}

function scoreField(
  field: string,
  term: string,
  exact: number,
  prefix: number,
  partial: number,
): number {
  if (field === term) return exact;
  if (field.startsWith(term)) return prefix;
  return field.includes(term) ? partial : 0;
}

/**
 * Ranks entries for a query. Every term must match somewhere. Titles count for
 * more than headings, which count for more than body text.
 */
export function search(index: readonly SearchEntry[], query: string, limit = 12): SearchResult[] {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const results: SearchResult[] = [];
  for (const entry of index) {
    const title = entry.title.toLowerCase();
    const heading = entry.heading.toLowerCase();
    const text = entry.text.toLowerCase();
    let total = 0;
    let everyTerm = true;
    for (const term of terms) {
      const score =
        scoreField(title, term, 100, 60, 30) +
        scoreField(heading, term, 50, 30, 15) +
        (text.includes(term) ? 4 : 0);
      if (score === 0) {
        everyTerm = false;
        break;
      }
      total += score;
    }
    if (everyTerm) {
      if (entry.kind === "utility") total += 5;
      if (entry.kind === "page") total += 2;
      results.push({ entry, score: total, snippet: snippetFor(entry.text, terms) });
    }
  }
  return results
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.entry.title.localeCompare(b.entry.title) ||
        a.entry.heading.localeCompare(b.entry.heading),
    )
    .slice(0, limit);
}
