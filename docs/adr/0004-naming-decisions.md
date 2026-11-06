# ADR 0004: Utility naming

**Status:** accepted

**Context.** Early sketches used both `pad(6)` and `padding(8)`, and both `bg` and `bg-color`. The language must not grow aliases.

**Decisions.**

- `padding` is the name. `pad` is **not** an alias; `pad(6)` fails with `unknown-utility` and suggests `padding`. Full words read better and match CSS.
- `bg` and `bg-color` differ deliberately: `bg(token)` sets `background-color`, whereas `bg[...]` sets the `background` shorthand and so accepts gradients. `bg-color` only ever sets `background-color`, including in bracket form.
- `flex(row)` is shorthand for display + direction. `flex-direction(row)` only sets direction, for use with `md:` variants when flex is already on.
- `color` and `scale` are deliberate, concise names for very common things, and the preferred ones in documentation. `color(white)` sets the text color, with `text-color` still available. `scale(105)` compiles to `transform: scale(1.05)`, alongside `transform`. These are the only exceptions: other new names need the same explicit decision. When both forms apply to an element, the concise one wins, because it's later in the registry.
- `ring` is added beyond the initial list because `focus:ring(2)` is the idiomatic focus style. `ring` and `shadow` both set `box-shadow`; they do not compose in v0, and `ring` wins because it is later in the registry.
- Per-side utilities (`padding-top`, `margin-left`, `border-bottom`) are added because multi-argument shorthands cannot express responsive single-side overrides.
