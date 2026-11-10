---
"@croffcss/registry": minor
"@croffcss/theme": minor
"@croffcss/scanner": patch
---

Right-to-left support, and three fixes from real use.

- Logical utilities that follow the text direction: `padding-start`, `padding-end`, `margin-start`, `margin-end`, `inset-start`, `inset-end`, `border-start`, `border-end`, `radius-start` and `radius-end`.
- `rtl:` and `ltr:` variants, which follow `dir` on the page or any ancestor.
- Theme values get the spaces CSS needs around `+` and `-` in `calc()`, `clamp()`, `min()` and `max()`, as bracket values already did. `clamp(2rem,1rem+3vw,4rem)` used to be dropped silently by the browser.
- Radius tokens accept anything `border-radius` does, such as `1rem 1rem 0 0` or `50% / 30%`.
- The scanner reads expressions glued to template tags, as in `{% if wide %}lg:grid-span(3){% endif %}`, for Jinja, Twig, Liquid, Blade and similar.
