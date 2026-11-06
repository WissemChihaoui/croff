import { useEffect, useMemo, useRef, useState } from "react";
import searchIndex from "virtual:search-index";
import { search } from "../lib/search";
import { useRouter } from "../router";

const KIND_LABEL = { page: "Page", section: "Section", utility: "Utility", variant: "Variant" };

export default function SearchDialog({ onClose }: { onClose: () => void }) {
  const { navigate } = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const results = useMemo(() => search(searchIndex, query), [query]);

  useEffect(() => input.current?.focus(), []);
  useEffect(() => setSelected(0), [query]);
  useEffect(() => {
    list.current?.children[selected]?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search the documentation"
      className="position(fixed) inset(0) z-index(50) bg(alpha(black,70)) padding(4) padding-top[10vh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-width[40rem] margin-x(auto) bg(surface) border(1,line-strong) radius[0.25rem] shadow(lg) overflow(hidden)">
        <input
          ref={input}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setSelected((index) => Math.min(index + 1, results.length - 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setSelected((index) => Math.max(index - 1, 0));
            }
            if (event.key === "Enter" && results[selected]) go(results[selected].entry.path);
          }}
          type="search"
          placeholder="Search pages, utilities and examples"
          aria-label="Search"
          className="width(full) bg(transparent) padding(4) text-size(md) text-color(fg) border-bottom(1,line) outline(none) focus:outline(none)"
        />
        {query.trim() !== "" && results.length === 0 && (
          <p className="padding(4) text-size(sm) text-color(faint)">Nothing found for "{query}".</p>
        )}
        {query.trim() === "" && (
          <p className="padding(4) text-size(sm) text-color(faint)">
            Try <code className="font(mono) text-color(soft)">gap</code>,{" "}
            <code className="font(mono) text-color(soft)">hover</code> or{" "}
            <code className="font(mono) text-color(soft)">source maps</code>.
          </p>
        )}
        {results.length > 0 && (
          <ul ref={list} role="listbox" className="max-height[60vh] overflow(auto)">
            {results.map((result, index) => (
              <li
                key={`${result.entry.path}-${result.entry.title}`}
                role="option"
                aria-selected={index === selected}
              >
                <a
                  href={result.entry.path}
                  onClick={(event) => {
                    event.preventDefault();
                    go(result.entry.path);
                  }}
                  onMouseEnter={() => setSelected(index)}
                  className={
                    index === selected
                      ? "flex(col) gap(1) padding(3,4) bg(raised) border-left(2,brand)"
                      : "flex(col) gap(1) padding(3,4) border-left(2,transparent)"
                  }
                >
                  <span className="flex(row) align(center) justify(between) gap(3)">
                    <span className="text-size(sm) text-color(fg) text-weight(medium)">
                      {result.entry.title}
                      {result.entry.heading && (
                        <span className="text-color(faint) text-weight(normal)">
                          {" "}
                          / {result.entry.heading}
                        </span>
                      )}
                    </span>
                    <span className="shrink(0) font(mono) text-size(xs) text-color(faint)">
                      {KIND_LABEL[result.entry.kind]}
                    </span>
                  </span>
                  <span className="text-size(xs) text-color(faint) truncate">{result.snippet}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
