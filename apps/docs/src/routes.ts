import type { DocPageData } from "./lib/markdown";
import { findPage, type NavPage } from "./nav";

export type RouteData =
  | { kind: "landing" }
  | { kind: "playground" }
  | { kind: "doc"; page: NavPage; data: DocPageData }
  | { kind: "utilities"; page: NavPage }
  | { kind: "components"; page: NavPage }
  | { kind: "not-found" };

const pages = import.meta.glob<{ default: DocPageData }>("../content/**/*.md");

/** Loads what a path needs, so that the render after it is synchronous. Also used before hydration. */
export async function loadRoute(pathname: string): Promise<RouteData> {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path === "/") return { kind: "landing" };
  if (path === "/playground") return { kind: "playground" };
  if (path.startsWith("/docs/")) {
    const page = findPage(path.slice("/docs/".length));
    if (page?.kind === "utilities") return { kind: "utilities", page };
    if (page?.kind === "components") return { kind: "components", page };
    if (page) {
      const load = pages[`../content/${page.slug}.md`];
      if (load) return { kind: "doc", page, data: (await load()).default };
    }
  }
  return { kind: "not-found" };
}

export function routeHead(route: RouteData): { title: string; description: string } {
  const suffix = "CROFF";
  switch (route.kind) {
    case "landing":
      return {
        title: "CROFF: style without the noise",
        description:
          "An expressive utility-first CSS framework. Designed for clarity. Built for speed.",
      };
    case "playground":
      return {
        title: `Playground | ${suffix}`,
        description:
          "Edit CROFF markup and theme tokens, and see the compiled CSS and the result live.",
      };
    case "doc":
      return { title: `${route.data.title} | ${suffix}`, description: route.data.description };
    case "utilities":
      return {
        title: `${route.page.title} utilities | ${suffix}`,
        description: `Reference for CROFF's ${route.page.title.toLowerCase()} utilities, generated from the registry.`,
      };
    case "components":
      return {
        title: `Component gallery | ${suffix}`,
        description:
          "Every component in @croffcss/ui, live, in the Chamfer design system's dark and light themes.",
      };
    case "not-found":
      return { title: `Not found | ${suffix}`, description: "This page doesn't exist." };
  }
}
