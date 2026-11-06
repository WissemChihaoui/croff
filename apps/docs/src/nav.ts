export interface NavPage {
  title: string;
  /** The path below /docs/. Markdown lives at content/<slug>.md. */
  slug: string;
  /** Generated from the registry instead of Markdown. */
  kind?: "utilities";
  /** The registry category, for generated pages. */
  category?: string;
}

export interface NavSection {
  title: string;
  pages: NavPage[];
}

const page = (title: string, slug: string): NavPage => ({ title, slug });

const utilities = (title: string, category: string): NavPage => ({
  title,
  slug: `utilities/${category}`,
  kind: "utilities",
  category,
});

export const nav: NavSection[] = [
  {
    title: "Introduction",
    pages: [
      page("What is CROFF?", "introduction/what-is-croff"),
      page("Philosophy", "introduction/philosophy"),
      page("Core concepts", "introduction/core-concepts"),
      page("Architecture", "introduction/architecture"),
      page("Browser support", "introduction/browser-support"),
      page("Roadmap", "introduction/roadmap"),
    ],
  },
  {
    title: "Getting Started",
    pages: [
      page("Installation", "getting-started/installation"),
      page("Project setup", "getting-started/project-setup"),
      page("Vite setup", "getting-started/vite-setup"),
      page("React setup", "getting-started/react-setup"),
      page("First component", "getting-started/first-component"),
      page("Production build", "getting-started/production-build"),
      page("Troubleshooting", "getting-started/troubleshooting"),
    ],
  },
  {
    title: "Core Concepts",
    pages: [
      page("Utility language", "concepts/utility-language"),
      page("Parsing", "concepts/parsing"),
      page("Variants", "concepts/variants"),
      page("Responsive design", "concepts/responsive-design"),
      page("Arbitrary values", "concepts/arbitrary-values"),
      page("Theme tokens", "concepts/theme-tokens"),
      page("CSS generation", "concepts/css-generation"),
    ],
  },
  {
    title: "Utilities",
    pages: [
      utilities("Layout", "layout"),
      utilities("Flexbox", "flexbox"),
      utilities("Grid", "grid"),
      utilities("Sizing", "sizing"),
      utilities("Spacing", "spacing"),
      utilities("Typography", "typography"),
      utilities("Backgrounds", "backgrounds"),
      utilities("Borders", "borders"),
      utilities("Effects", "effects"),
      utilities("Interactions", "interactions"),
    ],
  },
  {
    title: "Configuration",
    pages: [
      page("Configuration file", "configuration/configuration-file"),
      page("Theme customization", "configuration/theme-customization"),
      page("Breakpoints", "configuration/breakpoints"),
      page("Custom colors", "configuration/custom-colors"),
      page("Custom spacing", "configuration/custom-spacing"),
      page("CSS variables", "configuration/css-variables"),
      page("Source scanning", "configuration/source-scanning"),
    ],
  },
  {
    title: "Integrations",
    pages: [
      page("Vite", "integrations/vite"),
      page("PostCSS", "integrations/postcss"),
      page("React example", "integrations/react"),
      page("Vanilla HTML example", "integrations/vanilla"),
    ],
  },
  {
    title: "Extending CROFF",
    pages: [
      page("Plugins", "extending/plugins"),
      page("Creating utilities", "extending/creating-utilities"),
      page("Creating variants", "extending/creating-variants"),
      page("Extending the theme", "extending/extending-the-theme"),
      page("Plugin API reference", "extending/plugin-api"),
    ],
  },
  {
    title: "CLI Reference",
    pages: [page("croff", "cli/reference")],
  },
  {
    title: "Advanced",
    pages: [
      page("Compiler architecture", "advanced/compiler-architecture"),
      page("Build optimization", "advanced/build-optimization"),
      page("Dynamic utility limitations", "advanced/dynamic-utilities"),
      page("Debugging", "advanced/debugging"),
      page("Performance", "advanced/performance"),
    ],
  },
  {
    title: "Community",
    pages: [
      page("Contributing", "community/contributing"),
      page("Code of conduct", "community/code-of-conduct"),
      page("Changelog", "community/changelog"),
      page("Roadmap", "introduction/roadmap"),
    ],
  },
];

/** Every page once, in reading order. */
export function flatPages(): NavPage[] {
  const seen = new Set<string>();
  return nav
    .flatMap((section) => section.pages)
    .filter((entry) => {
      if (seen.has(entry.slug)) return false;
      seen.add(entry.slug);
      return true;
    });
}

export function findPage(slug: string): NavPage | undefined {
  return flatPages().find((entry) => entry.slug === slug);
}

export function utilityPath(category: string): string {
  return `/docs/utilities/${category}`;
}

export const FIRST_DOC = "/docs/introduction/what-is-croff";

/** Every route on the site. */
export function allRoutes(): string[] {
  return ["/", "/playground", ...flatPages().map((entry) => `/docs/${entry.slug}`)];
}
