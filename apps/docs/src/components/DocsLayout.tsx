import { useEffect, useState, type ReactNode } from "react";
import type { Heading } from "../lib/markdown";
import { flatPages, nav, type NavPage } from "../nav";
import { Link, useRouter } from "../router";

function SidebarLinks({ current, onNavigate }: { current: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Documentation" className="flex(col) gap(6) padding(5)">
      {nav.map((section) => (
        <div key={section.title} className="flex(col) gap(2)">
          <h2 className="font(mono) text-size(xs) text-color(faint) text-transform(uppercase) letter-spacing(wider)">
            {section.title}
          </h2>
          <ul className="flex(col) border-left(1,line)">
            {section.pages.map((page) => {
              const active = current === page.slug;
              return (
                <li key={page.slug}>
                  <Link
                    href={`/docs/${page.slug}`}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "display(block) padding-y(1) padding-x(3) margin-left[-1px] border-left(2,brand) bg(raised) text-size(sm) text-color(brand) text-weight(medium)"
                        : "display(block) padding-y(1) padding-x(3) text-size(sm) text-color(faint) transition(colors) duration(fast) hover:text-color(fg)"
                    }
                  >
                    {page.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function TableOfContents({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState<string | undefined>(headings[0]?.id);

  useEffect(() => {
    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => element !== null);
    if (elements.length === 0) return;
    const onScroll = () => {
      let current = elements[0]!.id;
      for (const element of elements) {
        if (element.getBoundingClientRect().top < 120) current = element.id;
      }
      // A short last section can't reach the top of the screen, so the end of the page selects it.
      const atEnd =
        window.scrollY > 0 &&
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      setActive(atEnd ? elements.at(-1)!.id : current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [headings]);

  if (headings.length === 0) return null;
  return (
    <nav aria-label="On this page" className="flex(col) gap(3) padding(5)">
      <h2 className="font(mono) text-size(xs) text-color(faint) text-transform(uppercase) letter-spacing(wider)">
        On this page
      </h2>
      <ul className="flex(col) gap(2) text-size(sm)">
        {headings.map((heading) => (
          <li key={heading.id} className={heading.level === 3 ? "padding-left(3)" : ""}>
            <a
              href={`#${heading.id}`}
              className={
                active === heading.id
                  ? "text-color(brand)"
                  : "text-color(faint) transition(colors) duration(fast) hover:text-color(fg)"
              }
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function PreviousNext({ page }: { page: NavPage }) {
  const pages = flatPages();
  const index = pages.findIndex((entry) => entry.slug === page.slug);
  const previous = pages[index - 1];
  const next = pages[index + 1];
  const box =
    "flex(col) gap(1) padding(5) bg(surface) border(1,line) transition(colors) duration(fast) hover:border-color(brand) hover:bg(raised)";
  return (
    <nav
      aria-label="Pagination"
      className="display(grid) columns(1) sm:columns(2) gap(3) margin-top(12)"
    >
      {previous ? (
        <Link href={`/docs/${previous.slug}`} className={box}>
          <span className="font(mono) text-size(xs) text-color(faint)">← Previous</span>
          <span className="text-color(fg) text-weight(semibold)">{previous.title}</span>
        </Link>
      ) : (
        <span className="display(none) sm:display(block)" />
      )}
      {next && (
        <Link href={`/docs/${next.slug}`} className={`${box} sm:text-align(right)`}>
          <span className="font(mono) text-size(xs) text-color(faint)">Next →</span>
          <span className="text-color(fg) text-weight(semibold)">{next.title}</span>
        </Link>
      )}
    </nav>
  );
}

export function DocsLayout({
  page,
  headings,
  children,
}: {
  page: NavPage;
  headings: Heading[];
  children: ReactNode;
}) {
  const { path } = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [path]);
  const section = nav.find((entry) => entry.pages.includes(page))?.title;

  return (
    <div className="max-width[88rem] width(full) margin-x(auto) lg:display(grid) lg:columns[16rem_minmax(0,1fr)] xl:columns[16rem_minmax(0,1fr)_15rem]">
      <aside className="display(none) lg:display(block) position(sticky) top[3.5rem] height[calc(100vh-3.5rem)] overflow(auto) border-right(1,line)">
        <SidebarLinks current={page.slug} />
      </aside>

      <main
        id="main-content"
        className="min-width(0) padding-x(5) md:padding-x(10) padding-y(8) md:padding-y(12)"
      >
        <div className="lg:display(none) margin-bottom(6)">
          <button
            type="button"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex(row) align(center) gap(3) width(full) padding(3) bg(raised) cut(sm) text-size(sm) text-color(fg)"
          >
            <span className="chamfer" />
            {menuOpen ? "Close menu" : `Menu: ${page.title}`}
          </button>
          {menuOpen && (
            <div className="border(1,line) border-top(none) bg(surface)">
              <SidebarLinks current={page.slug} onNavigate={() => setMenuOpen(false)} />
            </div>
          )}
        </div>
        <article className="max-width[46rem] margin-x(auto)">
          <p className="flex(row) align(center) gap(3) margin-bottom(4) font(mono) text-size(xs) text-color(faint) text-transform(uppercase) letter-spacing(widest)">
            <span className="chamfer" />
            {section}
          </p>
          {children}
          <PreviousNext page={page} />
        </article>
      </main>

      <aside className="display(none) xl:display(block) position(sticky) top[3.5rem] height[calc(100vh-3.5rem)] overflow(auto)">
        <TableOfContents headings={headings} />
      </aside>
    </div>
  );
}
