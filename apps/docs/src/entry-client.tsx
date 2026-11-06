import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { App } from "./App";
import { loadRoute } from "./routes";
import "./styles.css";

const container = document.getElementById("root")!;
const path = window.location.pathname;
const route = await loadRoute(path);
const app = (
  <StrictMode>
    <App initialPath={path} initialRoute={route} />
  </StrictMode>
);

// Prerendered pages are hydrated. In development there's no HTML yet, so render from scratch.
if (container.firstElementChild) hydrateRoot(container, app);
else createRoot(container).render(app);

if (window.location.hash) {
  document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView();
}
