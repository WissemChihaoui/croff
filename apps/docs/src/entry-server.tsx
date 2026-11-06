import { renderToString } from "react-dom/server";
import { App } from "./App";
import { escapeHtml } from "./lib/highlight";
import { allRoutes } from "./nav";
import { loadRoute, routeHead } from "./routes";

export { allRoutes };

export async function render(path: string): Promise<{ html: string; head: string }> {
  const route = await loadRoute(path);
  const { title, description } = routeHead(route);
  return {
    html: renderToString(<App initialPath={path} initialRoute={route} />),
    head: `<title>${escapeHtml(title)}</title>\n    <meta name="description" content="${escapeHtml(description)}" />`,
  };
}
