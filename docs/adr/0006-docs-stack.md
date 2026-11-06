# ADR 0006: Documentation site on Vite + React with static prerendering

**Status:** accepted

**Context.** Next.js and VitePress were both considered.

**Decision.** `apps/docs` is a Vite + React application, statically prerendered by a small script, with Markdown pages compiled by a local Vite plugin. The playground is a route in that app rather than a separate app.

**Why.**

- The site dogfoods `@croff/vite`, so every docs build is also an integration test of our primary integration.
- The playground needs the compiler in the browser. In a plain Vite app this is an ordinary import of `@croff/core`, with no framework boundary to manage.
- Prerendering takes about 80 lines and yields plain HTML files for any static host.
- A separate `apps/playground` would duplicate the shell and brand with no benefit.

`pnpm preview` uses a small static server rather than `vite preview`, whose SPA fallback answers every nested route with the landing page's HTML and so causes hydration mismatches that real static hosts don't.

**Cost.** We own a small amount of site infrastructure: router, Markdown plugin, highlighter, search. Each is small and tested, and the highlighter has to be ours anyway to understand CROFF expressions.
