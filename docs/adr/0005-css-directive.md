# ADR 0005: `@croff` CSS directive as the single integration point

**Status:** accepted

**Decision.** Generated CSS is placed wherever the at-rule `@croff;` appears in a stylesheet. `@croff reset;`, `@croff theme;` and `@croff utilities;` give finer control. The CLI, Vite plugin and PostCSS plugin all honour the same directive.

**Why.** The developer controls cascade position with one concept, and moving between integrations does not change the stylesheet. A virtual module would be Vite-specific.
