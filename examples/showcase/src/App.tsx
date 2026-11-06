import type { ReactNode } from "react";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex(col) gap(4) padding-y(8) border-top(1,gray-800)">
      <h2 className="font(mono) text-size(sm) color(muted) text-transform(uppercase) letter-spacing(widest)">
        {title}
      </h2>
      {children}
    </section>
  );
}

const button =
  "padding(2,4) radius(sm) text-weight(medium) transition(colors) focus-visible:ring(2,light) disabled:opacity(50) disabled:cursor(not-allowed)";

function Buttons() {
  return (
    <div className="flex(row) flex-wrap(wrap) gap(3)">
      <button className={`${button} bg(brand) color(dark) hover:bg(brand-dark) active:scale(98)`}>
        Primary
      </button>
      <button
        className={`${button} border(1,gray-700) hover:border-color(brand) hover:color(brand)`}
      >
        Secondary
      </button>
      <button className={`${button} hover:bg(gray-800) hover:color(brand)`}>Ghost</button>
      <button disabled className={`${button} bg(brand) color(dark)`}>
        Disabled
      </button>
    </div>
  );
}

function Cards() {
  const items = [
    ["Parse", "A tokenizer and parser turn each expression into an AST."],
    ["Resolve", "Every value is validated against your tokens and the utility's rules."],
    ["Compile", "Rules are sorted into a deterministic order and printed."],
  ];
  return (
    <div className="display(grid) columns(1) md:columns(3) gap(4)">
      {items.map(([title, body]) => (
        <article
          key={title}
          className="group bg(surface) border(1,gray-800) radius(md) padding(5) flex(col) gap(2) transition(colors) hover:border-color(brand)"
        >
          <h3 className="text-weight(semibold) group-hover:color(brand) transition(colors)">
            {title}
          </h3>
          <p className="color(muted) text-size(sm) line-clamp(3)">{body}</p>
        </article>
      ))}
    </div>
  );
}

function Navigation() {
  return (
    <nav className="flex(row) align(center) justify(between) bg(surface) border(1,gray-800) radius(md) padding(3,4)">
      <span className="font(mono) text-weight(bold) color(brand)">CROFF</span>
      <ul className="display(none) sm:flex(row) gap(5) text-size(sm)">
        {["Docs", "Utilities", "Playground"].map((item) => (
          <li key={item}>
            <a href="#" className="color(muted) hover:color(light) transition(colors)">
              {item}
            </a>
          </li>
        ))}
      </ul>
      <a href="#" className="sm:display(none) text-size(sm) color(muted)">
        Menu
      </a>
    </nav>
  );
}

const field =
  "width(full) bg(dark) border(1,gray-700) radius(sm) padding(2,3) transition(colors) focus:border-color(brand) focus:outline(none)";

function Form() {
  return (
    <form className="flex(col) gap(4) max-width[28rem]">
      <label className="flex(col) gap(1) text-size(sm) focus-within:color(brand)">
        Email
        <input type="email" placeholder="you@example.com" className={`${field} color(light)`} />
      </label>
      <label className="flex(col) gap(1) text-size(sm) focus-within:color(brand)">
        Message
        <textarea rows={3} className={`${field} color(light)`} />
      </label>
      <button type="button" className={`${button} bg(brand) color(dark) width(fit)`}>
        Send
      </button>
    </form>
  );
}

function Layouts() {
  return (
    <div className="flex(col) md:flex-direction(row) gap(4)">
      <aside className="bg(surface) border(1,gray-800) radius(md) padding(4) md:width(1/4) color(muted) text-size(sm)">
        Sidebar: a quarter of the width from the md breakpoint up.
      </aside>
      <div className="grow(1) display(grid) columns(2) lg:columns(4) gap(3)">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <div
            key={n}
            className="first:bg(brand) first:color(dark) aspect-ratio(square) bg(surface) border(1,gray-800) radius(sm) flex(row) align(center) justify(center) font(mono)"
          >
            {n}
          </div>
        ))}
      </div>
    </div>
  );
}

function Typography() {
  return (
    <div className="flex(col) gap(3)">
      <p className="text-size(5xl) text-weight(bold) line-height(none) letter-spacing(tight)">
        Display
      </p>
      <p className="text-size(2xl) text-weight(medium)">A heading with presence</p>
      <p className="color(muted) line-height(relaxed) max-width[60ch]">
        Body text, set at a comfortable measure. The width is an arbitrary value because a character
        count isn't a spacing token, and the bracket makes that visible.
      </p>
      <p className="font(mono) text-size(sm) color(brand)">font(mono) text-size(sm)</p>
    </div>
  );
}

export function App() {
  return (
    <div className="bg(dark) color(light) font(sans) min-height(screen)">
      <main className="max-width[64rem] margin(0,auto) padding(6) md:padding(10)">
        <h1 className="text-size(3xl) text-weight(bold) padding-bottom(8)">Component showcase</h1>
        <Section title="Buttons">
          <Buttons />
        </Section>
        <Section title="Cards">
          <Cards />
        </Section>
        <Section title="Navigation">
          <Navigation />
        </Section>
        <Section title="Forms">
          <Form />
        </Section>
        <Section title="Layouts">
          <Layouts />
        </Section>
        <Section title="Typography">
          <Typography />
        </Section>
      </main>
    </div>
  );
}
