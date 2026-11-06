import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DocsLayout } from "./components/DocsLayout";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { DocPage } from "./pages/DocPage";
import { Landing } from "./pages/Landing";
import { NotFound } from "./pages/NotFound";
import { Playground } from "./pages/Playground";
import { UtilitiesPage } from "./pages/UtilitiesPage";
import { RouterContext, shouldIntercept } from "./router";
import { loadRoute, routeHead, type RouteData } from "./routes";

const SearchDialog = lazy(() => import("./components/SearchDialog"));

function scrollToHash(hash: string) {
  if (!hash) {
    window.scrollTo(0, 0);
    return;
  }
  document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
}

export function App({
  initialPath,
  initialRoute,
}: {
  initialPath: string;
  initialRoute: RouteData;
}) {
  const [path, setPath] = useState(initialPath);
  const [route, setRoute] = useState(initialRoute);
  const [searchOpen, setSearchOpen] = useState(false);
  /** Where to scroll once the next route has rendered. */
  const pendingScroll = useRef<string | null>(null);

  // After the commit, because the anchor being scrolled to may only exist in the new route.
  useEffect(() => {
    if (pendingScroll.current === null) return;
    scrollToHash(pendingScroll.current);
    pendingScroll.current = null;
  }, [route]);

  const show = useCallback(async (to: string, push: boolean) => {
    const url = new URL(to, window.location.origin);
    const next = await loadRoute(url.pathname);
    if (push) window.history.pushState(null, "", url.pathname + url.search + url.hash);
    pendingScroll.current = url.hash;
    setPath(url.pathname);
    setRoute(next);
    document.title = routeHead(next).title;
  }, []);

  const navigate = useCallback((to: string) => void show(to, true), [show]);

  useEffect(() => {
    const onPopState = () => void show(window.location.href, false);

    // Links in Markdown are plain anchors, so handle them, and copy buttons, by delegation.
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const copy = target.closest<HTMLElement>("[data-copy]");
      if (copy) {
        const code = copy.closest(".code-block")?.querySelector("code")?.textContent ?? "";
        const report = (label: string) => {
          copy.textContent = label;
          window.setTimeout(() => (copy.textContent = "Copy"), 1500);
        };
        navigator.clipboard.writeText(code).then(
          () => report("Copied"),
          () => report("Copy failed"),
        );
        return;
      }
      const anchor = target.closest("a");
      if (anchor && !event.defaultPrevented && shouldIntercept(anchor, event)) {
        event.preventDefault();
        navigate(anchor.href);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };

    window.addEventListener("popstate", onPopState);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [navigate, show]);

  const router = useMemo(() => ({ path, navigate }), [path, navigate]);
  const openSearch = useCallback(() => setSearchOpen(true), []);

  return (
    <RouterContext.Provider value={router}>
      <div className="min-height(screen) flex(col) bg(ink) text-color(fg) font(sans)">
        <a
          href="#content"
          className="position(absolute) z-index(50) left(2) top[-4rem] focus:top(2) padding(2,4) bg(brand) text-color(ink) text-weight(semibold) radius[0.1875rem]"
        >
          Skip to content
        </a>
        <Header onSearch={openSearch} />
        <div className="grow(1) flex(col)">
          {route.kind === "landing" && <Landing />}
          {route.kind === "playground" && <Playground />}
          {route.kind === "doc" && (
            <DocsLayout page={route.page} headings={route.data.headings}>
              <DocPage data={route.data} />
            </DocsLayout>
          )}
          {route.kind === "utilities" && <UtilitiesPage page={route.page} />}
          {route.kind === "not-found" && <NotFound />}
        </div>
        {route.kind !== "playground" && <Footer />}
      </div>
      {searchOpen && (
        <Suspense fallback={null}>
          <SearchDialog onClose={() => setSearchOpen(false)} />
        </Suspense>
      )}
    </RouterContext.Provider>
  );
}
