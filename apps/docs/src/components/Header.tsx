import { useEffect, useState } from "react";
import { FIRST_DOC } from "../nav";
import { Link, useRouter } from "../router";
import { site } from "../site.config";

const links = [
  {
    label: "Docs",
    href: FIRST_DOC,
    match: (path: string) => path.startsWith("/docs") && !path.startsWith("/docs/utilities"),
  },
  {
    label: "Utilities",
    href: "/docs/utilities/layout",
    match: (path: string) => path.startsWith("/docs/utilities"),
  },
  { label: "Playground", href: "/playground", match: (path: string) => path === "/playground" },
];

export function Header({ onSearch }: { onSearch: () => void }) {
  const { path } = useRouter();
  // Set after hydration, since the prerendered page can't know the visitor's platform.
  const [shortcut, setShortcut] = useState("Ctrl K");
  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setShortcut("⌘ K");
  }, []);
  return (
    <header className="position(sticky) top(0) z-index(40) bg(alpha(ink,90)) backdrop-blur(8) border-bottom(1,line)">
      <div className="height[3.5rem] padding-x(4) md:padding-x(6) flex(row) align(center) gap(6)">
        <Link href="/" aria-label="CROFF home" className="flex(row) align(center) shrink(0)">
          <img
            src="/brand/croff-logo.png"
            alt="CROFF"
            width={1304}
            height={218}
            className="height(6) width(auto)"
          />
        </Link>
        <nav
          aria-label="Main"
          className="display(none) sm:flex(row) align(center) gap(5) text-size(sm)"
        >
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              aria-current={link.match(path) ? "page" : undefined}
              className={
                link.match(path)
                  ? "flex(row) align(center) height[3.5rem] text-color(fg) border-bottom(2,brand)"
                  : "flex(row) align(center) height[3.5rem] text-color(faint) border-bottom(2,transparent) hover:text-color(fg) transition(colors) duration(fast)"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="margin-left(auto) flex(row) align(center) gap(3)">
          <button
            type="button"
            onClick={onSearch}
            aria-label="Search the documentation"
            className="flex(row) align(center) gap(3) height(8) padding-x(3) bg(raised) cut(sm) text-size(sm) text-color(soft) transition(colors) duration(fast) hover:bg(line-strong) hover:text-color(fg)"
          >
            <span>Search</span>
            <kbd className="display(none) md:display(block) text-size(xs) text-color(faint)">
              {shortcut}
            </kbd>
          </button>
          <span className="display(none) md:display(block) font(mono) text-size(xs) text-color(faint)">
            v{site.version}
          </span>
          {site.githubUrl && (
            <a
              href={site.githubUrl}
              className="display(none) md:display(block) text-size(sm) text-color(faint) hover:text-color(fg)"
            >
              GitHub
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
