import { createCroff } from "@croff/core";
import { useMemo, useState, type ReactNode } from "react";
import { CodeBlock, CodeEditor, PreviewFrame } from "../components/Code";
import { compileMarkup } from "../lib/engine";
import { COMPARE_SAMPLE, EXPRESSIONS_SAMPLE, HERO_SAMPLE, MISTAKES_SAMPLE } from "../lib/samples";
import { FIRST_DOC } from "../nav";
import { Link } from "../router";
import { site } from "../site.config";

const REASONS = [
  [
    "Expressive syntax",
    "Utilities read like small function calls: flex(row), gap(4), md:width(1/2). A real parser reads them, not a pile of string splits.",
  ],
  [
    "Zero runtime styling",
    "Everything happens at build time. Your users download a stylesheet and nothing else, because no CROFF code runs in the browser.",
  ],
  [
    "Deterministic CSS",
    "The output is a function of the set of expressions in your source. The same source produces the same bytes, in any scan order.",
  ],
  [
    "Design tokens first",
    "Colors, spacing and type are tokens, compiled to custom properties. Only the tokens you use reach production.",
  ],
  [
    "Extensible by design",
    "Utilities and variants are data in a registry. A plugin adds its own through the same path as the built-ins.",
  ],
  [
    "Framework independent",
    "CROFF reads text and writes CSS. No markup is rewritten, so anything that renders a class attribute works.",
  ],
];

const ECOSYSTEM = [
  ["@croff/core", "Public API, configuration and project orchestration"],
  ["@croff/parser", "Tokenizer, parser and AST for the utility language"],
  ["@croff/compiler", "Deterministic CSS generation and source maps"],
  ["@croff/theme", "Design tokens and CSS variable generation"],
  ["@croff/registry", "Utility and variant definitions"],
  ["@croff/scanner", "Source scanning and file watching"],
  ["@croff/cli", "croff init, dev, build and check"],
  ["@croff/vite", "Vite plugin with hot updates"],
  ["@croff/postcss", "PostCSS plugin"],
  ["@croff/plugin-api", "Add utilities, variants and tokens"],
];

/** Real messages from the compiler. Only the file positions are made up. */
function realDiagnostics(): string {
  const { failures } = createCroff().compile(MISTAKES_SAMPLE);
  const positions = ["src/card.tsx:14:9", "src/card.tsx:12:18"];
  return failures
    .map((failure, index) => {
      const { code, message, hint } = failure.error;
      return `${positions[index]}: error ${code}: ${message}${hint ? `\n  hint: ${hint}` : ""}`;
    })
    .reverse()
    .join("\n");
}

function SectionLabel({ index, children }: { index: string; children: ReactNode }) {
  return (
    <p className="flex(row) align(center) gap(3) font(mono) text-size(xs) text-color(faint) text-transform(uppercase) letter-spacing(widest)">
      <span className="text-color(brand)">{index}</span>
      {children}
    </p>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="font(display) stretch(wide) text-size(3xl) md:text-size(4xl) text-weight(semibold) letter-spacing(tight) line-height(tight) max-width[34rem]">
      {children}
    </h2>
  );
}

const container = "max-width[88rem] margin-x(auto) padding-x(5) md:padding-x(10)";
const section = `${container} padding-y(16) md:padding-y(24) flex(col) gap(10)`;

function LivePreview() {
  const [markup, setMarkup] = useState(HERO_SAMPLE);
  const result = useMemo(() => compileMarkup(markup), [markup]);
  const framed = `<div style="height:100%;display:flex;align-items:center;justify-content:center;padding:1rem">${markup}</div>`;
  return (
    <div className="display(grid) columns(1) border(1,line-strong) radius[0.25rem] overflow(hidden) bg(surface)">
      <div className="flex(row) align(center) justify(between) padding(2,4) border-bottom(1,line)">
        <span className="font(mono) text-size(xs) text-color(faint)">Edit me</span>
        <span className="font(mono) text-size(xs) text-color(faint)">
          {result.problems.length > 0 ? (
            <span className="text-color(amber)">{result.problems[0]!.message}</span>
          ) : (
            `${result.ruleCount} rules, compiled in this tab`
          )}
        </span>
      </div>
      <CodeEditor
        value={markup}
        onChange={setMarkup}
        language="html"
        label="CROFF markup"
        className="height[17rem]"
      />
      <PreviewFrame
        title="Result"
        markup={framed}
        css={result.css}
        className="width(full) height[6.5rem] border(none) border-top(1,line) display(block)"
      />
      <div className="max-height[15rem] overflow(auto) border-top(1,line)">
        <pre className="padding(4) text-size(xs) line-height(relaxed) text-color(soft) font(mono)">
          <code>{result.displayCss}</code>
        </pre>
      </div>
    </div>
  );
}

function Compare() {
  const { displayCss } = useMemo(() => compileMarkup(COMPARE_SAMPLE), []);
  return (
    <div className="display(grid) columns(1) lg:columns(2) gap(4) align(start)">
      <CodeBlock code={COMPARE_SAMPLE} language="html" label="What you write" />
      <CodeBlock
        code={displayCss}
        language="css"
        label="What ships, generated by the real compiler"
      />
    </div>
  );
}

export function Landing() {
  return (
    <main id="content">
      <section
        className={`${container} padding-y(12) md:padding-y(20) display(grid) columns(1) xl:columns[minmax(0,1.1fr)_minmax(0,1fr)] gap(12) align(center)`}
      >
        <div className="flex(col) gap(8) align(start)">
          <img
            src="/brand/croff-logo.png"
            alt="CROFF"
            width={1304}
            height={218}
            className="height(8) md:height(10) width(auto)"
          />
          <h1 className="font(display) stretch(wide) text-size(5xl) md:text-size(7xl) 2xl:text-size(8xl) text-weight(bold) letter-spacing(tighter) line-height[1.02]">
            Style without the noise.
          </h1>
          <p className="text-size(lg) md:text-size(xl) text-color(soft) line-height(snug) max-width[32rem]">
            An expressive utility-first CSS framework. Designed for clarity. Built for speed.
          </p>
          <div className="flex(row) flex-wrap(wrap) gap(3)">
            <Link
              href="/docs/getting-started/installation"
              className="padding(3,6) bg(brand) text-color(ink) text-weight(semibold) radius[0.1875rem] transition(colors) duration(fast) hover:bg(fg)"
            >
              Get started
            </Link>
            <Link
              href={FIRST_DOC}
              className="padding(3,6) border(1,line-strong) text-color(fg) text-weight(medium) radius[0.1875rem] transition(colors) duration(fast) hover:border-color(brand) hover:text-color(brand)"
            >
              Explore documentation
            </Link>
          </div>
        </div>
        <LivePreview />
      </section>

      <div className="border-top(1,line)">
        <section className={section}>
          <SectionLabel index="01">Why CROFF</SectionLabel>
          <SectionTitle>A styling language, with a compiler behind it.</SectionTitle>
          <div className="display(grid) columns(1) md:columns(2) xl:columns(3) border-top(1,line) border-left(1,line)">
            {REASONS.map(([title, body]) => (
              <article
                key={title}
                className="flex(col) gap(3) padding(6) md:padding(8) border-right(1,line) border-bottom(1,line)"
              >
                <span className="chamfer" />
                <h3 className="text-size(lg) text-weight(semibold)">{title}</h3>
                <p className="text-color(faint) text-size(sm) line-height(relaxed)">{body}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="border-top(1,line) bg(surface)">
        <section className={section}>
          <SectionLabel index="02">Input and output</SectionLabel>
          <SectionTitle>What you read is what you debug.</SectionTitle>
          <p className="text-color(soft) max-width[38rem] line-height(relaxed)">
            Each expression becomes one rule whose selector is that expression. Nothing in your
            markup is rewritten, so the class you see in DevTools is the class you wrote.
          </p>
          <Compare />
        </section>
      </div>

      <div className="border-top(1,line)">
        <section className={section}>
          <SectionLabel index="03">In version {site.version}</SectionLabel>
          <div className="display(grid) columns(1) lg:columns(2) gap(12)">
            <div className="flex(col) gap(4)">
              <h3 className="text-size(2xl) text-weight(semibold)">
                Parentheses are checked. Brackets are raw.
              </h3>
              <p className="text-color(soft) line-height(relaxed)">
                <code className="font(mono) text-color(fg)">gap(4)</code> must be a token.{" "}
                <code className="font(mono) text-color(fg)">gap[1.5rem]</code> is an explicit escape
                hatch to raw CSS. A reviewer can spot every off-system value at a glance.
              </p>
              <CodeBlock language="croff" label="expressions" code={EXPRESSIONS_SAMPLE} />
            </div>
            <div className="flex(col) gap(4)">
              <h3 className="text-size(2xl) text-weight(semibold)">
                Mistakes are errors, with a way forward.
              </h3>
              <p className="text-color(soft) line-height(relaxed)">
                <code className="font(mono) text-color(fg)">croff check</code> reports unknown
                utilities, invalid values, whitespace inside expressions and class names built at
                runtime, each with its file and position.
              </p>
              <CodeBlock language="text" label="croff check" code={realDiagnostics()} />
            </div>
          </div>
        </section>
      </div>

      <div className="border-top(1,line) bg(surface)">
        <section className={section}>
          <SectionLabel index="04">Installation</SectionLabel>
          <SectionTitle>Add it to a Vite project in three steps.</SectionTitle>
          <div className="display(grid) columns(1) lg:columns(3) gap(4) align(start)">
            <CodeBlock
              language="bash"
              label="1. Install"
              code={`pnpm add -D @croff/core @croff/vite`}
            />
            <CodeBlock
              language="ts"
              label="2. vite.config.ts"
              code={`import croff from "@croff/vite";\n\nexport default {\n  plugins: [croff()],\n};`}
            />
            <CodeBlock language="css" label="3. src/croff.css" code={`@croff reset;\n@croff;`} />
          </div>
          {!site.published && (
            <p className="text-size(sm) text-color(faint) max-width[42rem] border-left(2,brand) padding-left(4)">
              Version {site.version} is a pre-release and isn't on a package registry yet. Until it
              is, the{" "}
              <Link
                href="/docs/getting-started/installation"
                className="text-color(fg) text-decoration(underline)"
              >
                installation guide
              </Link>{" "}
              explains how to build and link it from source.
            </p>
          )}
        </section>
      </div>

      <div className="border-top(1,line)">
        <section className={section}>
          <SectionLabel index="05">Ecosystem</SectionLabel>
          <SectionTitle>Small packages, each with one job.</SectionTitle>
          <ul className="border-top(1,line)">
            {ECOSYSTEM.map(([name, description]) => (
              <li
                key={name}
                className="display(grid) columns(1) md:columns[16rem_minmax(0,1fr)_auto] gap(1) md:gap(4) padding-y(3) border-bottom(1,line) text-size(sm)"
              >
                <code className="font(mono) text-color(fg)">{name}</code>
                <span className="text-color(faint)">{description}</span>
                <span className="font(mono) text-size(xs) text-color(brand)">
                  works in {site.version}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="border-top(1,line) bg(brand) text-color(ink)">
        <section
          className={`${container} padding-y(16) md:padding-y(24) flex(col) gap(8) align(start)`}
        >
          <h2 className="font(display) stretch(wide) text-size(4xl) md:text-size(6xl) text-weight(bold) letter-spacing(tighter) line-height(none) max-width[48rem]">
            Try the compiler now.
          </h2>
          <div className="flex(row) flex-wrap(wrap) gap(3)">
            <Link
              href="/playground"
              className="padding(3,6) bg(ink) text-color(fg) text-weight(semibold) radius[0.1875rem] transition(colors) duration(fast) hover:bg(raised)"
            >
              Open the playground
            </Link>
            <Link
              href="/docs/getting-started/installation"
              className="padding(3,6) border(1,ink) text-weight(semibold) radius[0.1875rem] transition(colors) duration(fast) hover:bg(ink) hover:text-color(fg)"
            >
              Get started
            </Link>
            <Link
              href="/docs/community/contributing"
              className="padding(3,6) border(1,ink) text-weight(semibold) radius[0.1875rem] transition(colors) duration(fast) hover:bg(ink) hover:text-color(fg)"
            >
              Contribute
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
