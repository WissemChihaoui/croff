/**
 * Sample markup compiled live in the browser. It lives in a .ts file because the
 * site's content patterns only cover .tsx: samples must not feed the site's own
 * stylesheet, and the deliberate mistakes below must not produce build errors.
 */

export const HERO_SAMPLE = `<button class="
  flex(row) align(center) gap(2)
  padding(3,5) radius(sm)
  bg(brand) color(dark)
  text-weight(semibold)
  transition(colors)
  hover:bg(light)
  focus-visible:ring(2,light)
">
  Get started
</button>`;

export const COMPARE_SAMPLE = `<div class="
  flex(col) md:flex(row)
  gap(4) padding(6)
  bg[#121212] radius(lg)
  width[calc(100%-2rem)]
">
  <h2 class="text-size(xl) hover:color(brand)">
    Hello CROFF
  </h2>
</div>`;

export const EXPRESSIONS_SAMPLE = `bg(brand)
bg(alpha(brand,50))
width[calc(100%-var(--sidebar-width))]
md:hover:transform(translate-y(-2px),scale(1.02))`;

/** Deliberate mistakes, compiled on the landing page to show real error messages. */
export const MISTAKES_SAMPLE = ["pad(4)", "bg(brnad)"];

export const PRESETS: Record<string, string> = {
  Card: `<div class="min-height(screen) flex(row) align(center) justify(center) padding(6)">
  <article class="
    group flex(col) gap(3)
    max-width[22rem] padding(6)
    bg(gray-900) border(1,gray-700) radius(lg)
    transition(colors) hover:border-color(brand)
  ">
    <h2 class="text-size(xl) text-weight(bold) group-hover:color(brand) transition(colors)">
      Design tokens
    </h2>
    <p class="color(gray-400) line-height(relaxed)">
      Every value in parentheses comes from your theme. Change a token and see it apply.
    </p>
    <button class="
      width(fit) padding(2,4) radius(sm)
      bg(brand) color(dark) text-weight(semibold)
      transition(colors) hover:bg(brand-dark)
      focus-visible:ring(2,light)
    ">
      Read more
    </button>
  </article>
</div>`,
  Responsive: `<div class="
  display(grid) columns(1) sm:columns(2) lg:columns(4)
  gap(4) padding(6)
">
  <div class="padding(6) bg(gray-900) radius(md)">One</div>
  <div class="padding(6) bg(gray-900) radius(md)">Two</div>
  <div class="padding(6) bg(gray-900) radius(md)">Three</div>
  <div class="padding(6) bg(brand) color(dark) radius(md) sm:grid-span(2) lg:grid-span(1)">
    Four
  </div>
</div>`,
  "Arbitrary values": `<div class="padding(6) flex(col) gap(4)">
  <div class="width[calc(100%-4rem)] height[6rem] bg[linear-gradient(90deg,#c8fd12,#0a0a0a)] radius(md)"></div>
  <p class="text-size[clamp(1rem,4vw,2.5rem)] letter-spacing[-0.03em] font['Georgia',serif]">
    Brackets take raw CSS.
  </p>
  <div class="columns[1fr_2fr] display(grid) gap[0.5rem]">
    <div class="bg(gray-800) padding(3)">1fr</div>
    <div class="bg(gray-800) padding(3)">2fr</div>
  </div>
</div>`,
  "Variant groups": `<div class="md:(flex(row),gap(6),padding(8)) flex(col) gap(3) padding(4)">
  <button class="
    padding(2,4) radius(sm) bg(gray-800)
    transition(all)
    hover:(bg(brand),color(dark),scale(105))
    focus-visible:(ring(2,light),bg(brand-dark))
  ">
    Hover me
  </button>
  <p class="
    color(gray-400)
    md:(text-size(lg),hover:(color(brand),text-decoration(underline)))
    width[calc(100%-2rem)]
    lg:(width[50%],letter-spacing[-0.02em])
  ">
    One variant, written once. Each member compiles to the same rule as writing it out in full.
  </p>
</div>`,
  "A few mistakes": `<div class="padding(6) flex(col) gap(4)">
  <p class="pad(4)">pad isn't a utility.</p>
  <p class="gap(banana)">banana isn't a spacing token.</p>
  <p class="bg(brnad)">A typo in a token.</p>
  <p class="hovr:bg(brand)">A typo in a variant.</p>
  <p class="width[calc(100% - 1px)]">Whitespace splits a class attribute.</p>
  <p class="width(320px)">Raw lengths belong in brackets.</p>
</div>`,
};
