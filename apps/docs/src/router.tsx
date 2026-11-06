import { createContext, useContext, type AnchorHTMLAttributes, type MouseEvent } from "react";

export interface Router {
  path: string;
  navigate(to: string): void;
}

export const RouterContext = createContext<Router>({ path: "/", navigate: () => {} });

export function useRouter(): Router {
  return useContext(RouterContext);
}

/** Whether a click should be left to the browser: new tabs, downloads and so on. */
function isModified(event: MouseEvent | globalThis.MouseEvent): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

export function shouldIntercept(anchor: HTMLAnchorElement, event: globalThis.MouseEvent): boolean {
  if (isModified(event) || anchor.target === "_blank" || anchor.hasAttribute("download"))
    return false;
  // Same-page anchors, such as the table of contents, are left to the browser.
  const samePage = anchor.pathname === window.location.pathname && anchor.hash !== "";
  return anchor.origin === window.location.origin && !samePage;
}

export function Link({
  href,
  onClick,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { navigate } = useRouter();
  return (
    <a
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && href && !isModified(event)) {
          event.preventDefault();
          navigate(href);
        }
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
