import { builtinUtilities, createCroff } from "@croff/core";
import { Badge, Button, Card, CardBody, Checkbox, Progress, Radio, Switch } from "@croff/ui/react";
import { useMemo, useState, type ReactNode } from "react";
import { CodeBlock, CodeEditor, PreviewFrame } from "../components/Code";
import { compileMarkup } from "../lib/engine";
import {
  ANATOMY,
  COMPARE_SAMPLE,
  EXPRESSIONS_SAMPLE,
  HERO_SAMPLE,
  MISTAKES_SAMPLE,
} from "../lib/samples";
import { FIRST_DOC } from "../nav";
import { Link } from "../router";
import { site } from "../site.config";

const engine = createCroff();

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
  ["@croff/ui", "Ready-to-use components, in the Chamfer design system"],
];

const PIPELINE = [
  ["Your source", "Any text file"],
  ["Scanner", "Finds expressions"],
  ["Parser", "Reads the grammar"],
  ["Registry", "Checks against your theme"],
  ["Compiler", "Orders and prints"],
  ["CSS", "Only what you used"],
];

const STATS = [
  [String(builtinUtilities.length), "utilities"],
  [String(engine.registry.listVariants().length), "variants"],
  [String(ECOSYSTEM.length), "packages"],
  ["0", "bytes of runtime in your app"],
];

/** Real compiler output, so the noise behind the headline is what a stylesheet actually holds. */
const NOISE = engine
  .compile(builtinUtilities.flatMap((utility) => utility.examples))
  .css.split("\n")
  // A long line would run into the next column.
  .filter((line) => line.trim() !== "" && line.length < 44)
  .join("\n")
  .slice(0, 7000);

/** Real messages from the compiler. Only the file positions are made up. */
function realDiagnostics(): string {
  const { failures } = engine.compile(MISTAKES_SAMPLE);
  const positions = ["src/card.tsx:14:9", "src/card.tsx:12:18"];
  return failures
    .map((failure, index) => {
      const { code, message, hint } = failure.error;
      return `${positions[index]}: error ${code}: ${message}${hint ? `\n  hint: ${hint}` : ""}`;
    })
    .reverse()
    .join("\n");
}

const container = "max-width[88rem] margin-x(auto) padding-x(5) md:padding-x(10)";
const section = `${container} padding-y(16) md:padding-y(24) flex(col) gap(10) md:gap(12)`;
const primaryButton =
  "flex(row) align(center) gap(2) padding(3,6) bg(brand) text-color(ink) text-weight(semibold) cut(sm) transition(colors) duration(fast) hover:bg(fg)";
const secondaryButton =
  "flex(row) align(center) gap(2) padding(3,6) bg(raised) text-color(fg) text-weight(medium) cut(sm) transition(colors) duration(fast) hover:bg(line-strong)";
const paneTitle = "font(mono) text-size(xs) text-color(faint)";
const paneHead =
  "flex(row) align(center) justify(between) gap(3) height[2.75rem] padding-x(4) border-bottom(1,line)";

function SectionHead({
  index,
  label,
  title,
  children,
}: {
  index: string;
  label: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex(col) gap(5)">
      <p className="flex(row) align(center) gap(3) font(mono) text-size(xs) text-color(faint) text-transform(uppercase) letter-spacing(widest)">
        <span className="chamfer" />
        <span className="text-color(brand)">{index}</span>
        {label}
      </p>
      <h2 className="font(display) stretch(wide) text-size[clamp(2rem,4.6vw,4rem)] text-weight(bold) letter-spacing(tighter) line-height[1.04] max-width[56rem]">
        {title}
      </h2>
      {children && (
        <p className="text-size(lg) text-color(soft) max-width[42rem] line-height(relaxed)">
          {children}
        </p>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section className="position(relative) overflow(hidden) border-bottom(1,line)">
      <div aria-hidden="true" className="noise">
        {NOISE}
      </div>
      <div aria-hidden="true" className="slashes">
        <i />
        <i />
        <i />
      </div>
      <div
        className={`${container} position(relative) padding-top(16) md:padding-top(24) padding-bottom(16) md:padding-bottom(20) flex(col) gap(8) md:gap(10)`}
      >
        <p className="rise flex(row) align(center) gap(3) font(mono) text-size(xs) text-color(soft) letter-spacing(wide)">
          <span className="chamfer" />v{site.version}, pre-release
        </p>
        <h1 className="rise rise-1 font(display) stretch(wide) text-size[clamp(3.1rem,9.2vw,9.5rem)] text-weight(bold) letter-spacing(tighter) line-height[0.98]">
          Style without <br className="display(none) md:display(inline)" />
          the noise<span className="text-color(brand)">.</span>
        </h1>
        <div className="rise rise-2 flex(col) gap(8) align(start)">
          <p className="text-size(xl) md:text-size(2xl) text-color(soft) line-height(snug) max-width[34rem]">
            An expressive utility-first CSS framework. Designed for clarity. Built for speed.
          </p>
          <div className="flex(row) flex-wrap(wrap) gap(3)">
            <Link href="/docs/getting-started/installation" className={primaryButton}>
              Get started <span aria-hidden="true">→</span>
            </Link>
            <Link href={FIRST_DOC} className={secondaryButton}>
              Explore documentation
            </Link>
          </div>
        </div>
      </div>
      <div className="position(relative) border-top(1,line) bg(alpha(ink,80)) backdrop-blur(8)">
        <dl
          className={`${container} display(grid) columns(2) lg:columns(4) gap(6) padding-y(6) md:padding-y(8)`}
        >
          {STATS.map(([value, label]) => (
            <div key={label} className="flex(col) gap(1)">
              <dd className="font(display) stretch(wide) text-size(3xl) md:text-size(4xl) text-weight(bold) letter-spacing(tight)">
                {value}
              </dd>
              <dt className="font(mono) text-size(xs) text-color(faint)">{label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Bench() {
  const [markup, setMarkup] = useState(HERO_SAMPLE);
  const result = useMemo(() => compileMarkup(markup), [markup]);
  const framed = `<div style="height:100%;display:flex;align-items:center;justify-content:center;padding:1rem">${markup}</div>`;
  const problem = result.problems[0];
  return (
    <section className={section}>
      <SectionHead index="01" label="Live compiler" title="Type here. It compiles in this tab.">
        This is the real compiler, running in your browser. Change a class and watch the stylesheet
        rewrite itself.
      </SectionHead>
      <div className="reveal panel display(grid) columns(1) xl:columns[minmax(0,1.15fr)_minmax(0,0.8fr)_minmax(0,1.05fr)] bg(surface)">
        <div className="flex(col) min-width(0) border-bottom(1,line) xl:border-bottom(none) xl:border-right(1,line)">
          <div className={paneHead}>
            <span className={paneTitle}>You write</span>
          </div>
          <CodeEditor
            value={markup}
            onChange={setMarkup}
            language="html"
            label="CROFF markup"
            className="height[19rem] xl:height[24rem]"
          />
        </div>
        <div className="flex(col) min-width(0) border-bottom(1,line) xl:border-bottom(none) xl:border-right(1,line)">
          <div className={paneHead}>
            <span className={paneTitle}>You get</span>
          </div>
          <PreviewFrame
            title="Result"
            markup={framed}
            css={result.css}
            className="grow(1) width(full) min-height[9rem] border(none) display(block)"
          />
        </div>
        <div className="flex(col) min-width(0)">
          <div className={paneHead}>
            <span className={paneTitle}>It ships</span>
            {problem ? (
              <span className="font(mono) text-size(xs) text-color(amber) truncate">
                {problem.message}
              </span>
            ) : (
              <span className="font(mono) text-size(xs) text-color(brand)">
                {result.ruleCount} rules
              </span>
            )}
          </div>
          <div className="height[19rem] xl:height[24rem] overflow(auto)">
            <pre className="padding(4) text-size(xs) line-height(relaxed) text-color(soft) font(mono)">
              <code>{result.displayCss}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

function Anatomy() {
  const [selected, setSelected] = useState(0);
  const [focused, setFocused] = useState<number | null>(null);
  const example = ANATOMY[selected]!;
  const output = useMemo(() => engine.compile([example.source]).css, [example]);
  const dimmed = (index: number) =>
    focused !== null && focused !== index ? "opacity(25)" : "opacity(100)";
  return (
    <div className="border-top(1,line) bg(surface)">
      <section className={section}>
        <SectionHead index="02" label="The language" title="Every part of a class means something.">
          An expression has a grammar and a real parser. Read one from left to right.
        </SectionHead>
        <div className="flex(row) flex-wrap(wrap) gap(2)">
          {ANATOMY.map((item, index) => (
            <button
              key={item.source}
              type="button"
              aria-pressed={index === selected}
              onClick={() => {
                setSelected(index);
                setFocused(null);
              }}
              className={
                index === selected
                  ? "padding(2,3) font(mono) text-size(xs) bg(brand) text-color(ink) cut(sm)"
                  : "padding(2,3) font(mono) text-size(xs) bg(raised) text-color(soft) cut(sm) transition(colors) duration(fast) hover:text-color(fg)"
              }
            >
              {item.name}
            </button>
          ))}
        </div>
        <div className="reveal flex(col) gap(8)">
          <p className="anatomy-expression font(mono) text-size[clamp(1.5rem,4.4vw,3.75rem)] text-weight(medium) line-height(tight)">
            {example.parts.map((part, index) => (
              <span
                key={part.text}
                className={`t-${part.kind} ${dimmed(index)} transition(opacity) duration(fast)`}
              >
                {part.text}
              </span>
            ))}
          </p>
          <ul className="display(grid) columns(1) sm:columns(2) xl:columns(4) gap(3)">
            {example.parts.map((part, index) => (
              <li
                key={part.text}
                onMouseEnter={() => setFocused(index)}
                onMouseLeave={() => setFocused(null)}
                className={`anatomy-part anatomy-${part.kind} flex(col) gap(2) padding(4) bg(ink)`}
              >
                <code className={`t-${part.kind} text-size(sm)`}>{part.text}</code>
                <strong className="text-size(sm) text-weight(semibold)">{part.label}</strong>
                <span className="text-size(sm) text-color(faint) line-height(snug)">
                  {part.note}
                </span>
              </li>
            ))}
          </ul>
          <CodeBlock code={output} language="css" label="Generated by the real compiler" />
        </div>
      </section>
    </div>
  );
}

function Reasons() {
  const card = "reveal flex(col) gap(3) padding(6) md:padding(8) bg(surface) border(1,line)";
  const heading = "text-size(xl) text-weight(semibold)";
  const body = "text-color(faint) line-height(relaxed)";
  return (
    <section className={section}>
      <SectionHead
        index="03"
        label="Why CROFF"
        title="A styling language, with a compiler behind it."
      />
      <div className="display(grid) columns(1) md:columns(6) gap(3)">
        <article className="reveal flex(col) justify(between) gap(6) padding(6) md:padding(8) bg(brand) text-color(ink) cut(lg) md:grid-span(2)">
          <span className="font(display) stretch(wide) text-size[clamp(5rem,10vw,9rem)] text-weight(bold) line-height(none)">
            0
          </span>
          <div className="flex(col) gap(2)">
            <h3 className="text-size(xl) text-weight(bold)">Zero runtime styling</h3>
            <p className="line-height(relaxed)">
              Everything happens at build time. Your users download a stylesheet and nothing else,
              because no CROFF code runs in the browser.
            </p>
          </div>
        </article>
        <article className={`${card} justify(between) md:grid-span(4)`}>
          <p className="font(mono) text-size[clamp(1.5rem,3.9vw,3.5rem)] line-height(tight) text-color(fg)">
            <span className="t-utility">flex</span>(row) <span className="t-utility">gap</span>(4){" "}
            <span className="t-variant">md:</span>
            <span className="t-utility">width</span>(1/2)
          </p>
          <div className="flex(col) gap(2)">
            <h3 className={heading}>Expressive syntax</h3>
            <p className={body}>
              Utilities read like small function calls. A real parser reads them, not a pile of
              string splits.
            </p>
          </div>
        </article>
        <article className={`${card} md:grid-span(2)`}>
          <h3 className={heading}>Deterministic CSS</h3>
          <p className={body}>
            The output is a function of the set of expressions in your source. The same source
            produces the same bytes, in any scan order.
          </p>
        </article>
        <article className={`${card} md:grid-span(2)`}>
          <h3 className={heading}>Design tokens first</h3>
          <p className={body}>
            Colors, spacing and type are tokens, compiled to custom properties. Only the tokens you
            use reach production.
          </p>
        </article>
        <article className={`${card} md:grid-span(2)`}>
          <h3 className={heading}>Extensible by design</h3>
          <p className={body}>
            Utilities and variants are data in a registry. A plugin adds its own through the same
            path as the built-ins.
          </p>
        </article>
        <article
          className={`${card} md:grid-span(6) lg:flex(row) lg:align(center) lg:justify(between) lg:gap(12)`}
        >
          <div className="flex(col) gap(2) max-width[38rem]">
            <h3 className={heading}>Framework independent</h3>
            <p className={body}>
              CROFF reads text and writes CSS. No markup is rewritten, so anything that renders a
              class attribute works.
            </p>
          </div>
          <p className="flex(row) flex-wrap(wrap) gap(2) font(mono) text-size(xs) text-color(soft)">
            {[".html", ".jsx", ".tsx", ".vue", ".svelte", ".astro", ".mdx"].map((extension) => (
              <span key={extension} className="padding(1,3) bg(raised) cut(sm)">
                {extension}
              </span>
            ))}
          </p>
        </article>
      </div>
    </section>
  );
}

function Components() {
  return (
    <div className="border-top(1,line) bg(surface)">
      <section className={section}>
        <SectionHead index="04" label="Components" title="Ready to use, and built with CROFF.">
          @croff/ui is a set of components with a design system of its own, taken from the shapes of
          the logo. Every color and size is a token you can change.
        </SectionHead>
        <div className="reveal display(grid) columns(1) md:columns(3) gap(3)">
          <Card title="Buttons">
            <div className="flex(row) flex-wrap(wrap) gap(2)">
              <Button>Primary</Button>
              <Button tone="secondary">Secondary</Button>
              <Button tone="ghost">Ghost</Button>
            </div>
            <CardBody>Cut corners on anything you can press.</CardBody>
          </Card>
          <Card title="Status">
            <div className="flex(row) flex-wrap(wrap) gap(2)">
              <Badge tone="brand">New</Badge>
              <Badge tone="success">Passing</Badge>
              <Badge tone="danger">Failed</Badge>
            </div>
            <Progress value={64} label="Example progress" />
            <CardBody>The logo's slash marks status, and leads the way.</CardBody>
          </Card>
          <Card title="Controls">
            <div className="flex(col) gap(3)">
              <Checkbox label="Checked shows a slash" defaultChecked />
              <Radio label="Radio buttons are diamonds" name="landing-demo" defaultChecked />
              <Switch label="The thumb slides across" defaultChecked />
            </div>
          </Card>
        </div>
        <div className="flex(row) flex-wrap(wrap) gap(3)">
          <Link href="/docs/components/gallery" className={primaryButton}>
            See every component <span aria-hidden="true">→</span>
          </Link>
          <Link href="/docs/components/overview" className={secondaryButton}>
            How to use them
          </Link>
        </div>
      </section>
    </div>
  );
}

function Compare() {
  const { displayCss } = useMemo(() => compileMarkup(COMPARE_SAMPLE), []);
  return (
    <div className="border-top(1,line)">
      <section className={section}>
        <SectionHead index="05" label="Input and output" title="What you read is what you debug.">
          Each expression becomes one rule whose selector is that expression. Nothing in your markup
          is rewritten, so the class you see in DevTools is the class you wrote.
        </SectionHead>
        <div className="reveal side-by-side display(grid) columns(1) lg:columns(2) gap(3)">
          <CodeBlock code={COMPARE_SAMPLE} language="html" label="What you write" />
          <CodeBlock
            code={displayCss}
            language="css"
            label="What ships, generated by the real compiler"
          />
        </div>
      </section>
    </div>
  );
}

function Guarantees() {
  return (
    <section className={section}>
      <SectionHead index="06" label={`In version ${site.version}`} title="Rules you can rely on." />
      <div className="display(grid) columns(1) lg:columns(2) gap(3)">
        <div className="reveal flex(col) gap(5) padding(6) md:padding(8) bg(surface) border(1,line)">
          <p aria-hidden="true" className="glyphs font(mono) text-size(6xl) line-height(none)">
            <span className="text-color(brand)">( )</span>{" "}
            <span className="text-color(amber)">[ ]</span>
          </p>
          <h3 className="text-size(2xl) text-weight(semibold)">
            Parentheses are checked. Brackets are raw.
          </h3>
          <p className="text-color(soft) line-height(relaxed)">
            <code className="font(mono) text-color(fg)">gap(4)</code> must be a token.{" "}
            <code className="font(mono) text-color(fg)">gap[1.5rem]</code> is an explicit escape
            hatch to raw CSS. A reviewer can spot every off-system value at a glance.
          </p>
          <div className="flush-block">
            <CodeBlock language="croff" label="expressions" code={EXPRESSIONS_SAMPLE} />
          </div>
        </div>
        <div className="reveal flex(col) gap(5) padding(6) md:padding(8) bg(surface) border(1,line)">
          <p aria-hidden="true" className="glyphs font(mono) text-size(6xl) line-height(none)">
            <span className="text-color(red)">✗</span> <span className="text-color(brand)">→</span>
          </p>
          <h3 className="text-size(2xl) text-weight(semibold)">
            Mistakes are errors, with a way forward.
          </h3>
          <p className="text-color(soft) line-height(relaxed)">
            <code className="font(mono) text-color(fg)">croff check</code> reports unknown
            utilities, invalid values, whitespace inside expressions and class names built at
            runtime, each with its file and position.
          </p>
          <div className="flush-block">
            <CodeBlock language="text" label="croff check" code={realDiagnostics()} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Install() {
  const steps = [
    ["bash", "Install", `pnpm add -D @croff/core @croff/vite`],
    [
      "ts",
      "vite.config.ts",
      `import croff from "@croff/vite";\n\nexport default {\n  plugins: [croff()],\n};`,
    ],
    ["css", "src/croff.css", `@croff reset;\n@croff;`],
  ] as const;
  return (
    <div className="border-top(1,line) bg(surface)">
      <section className={section}>
        <SectionHead
          index="07"
          label="Installation"
          title="Add it to a Vite project in three steps."
        />
        <ol className="display(grid) columns(1) lg:columns(3) gap(8) lg:gap(4)">
          {steps.map(([language, label, code], index) => (
            <li key={label} className="reveal flex(col) gap(4) min-width(0)">
              <span className="font(display) stretch(wide) text-size(5xl) text-weight(bold) text-color(brand) line-height(none)">
                {index + 1}
              </span>
              <div className="flush-block">
                <CodeBlock language={language} label={label} code={code} />
              </div>
            </li>
          ))}
        </ol>
        {!site.published && (
          <p className="text-size(sm) text-color(soft) max-width[42rem] border-left(2,brand) padding-left(4) line-height(relaxed)">
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
  );
}

function Ecosystem() {
  return (
    <section className={section}>
      <SectionHead index="08" label="Ecosystem" title="Small packages, each with one job." />
      <ol className="reveal display(grid) columns(2) md:columns(3) xl:columns(6) gap(px) bg(line) border(1,line)">
        {PIPELINE.map(([name, note], index) => (
          <li
            key={name}
            className={
              index === PIPELINE.length - 1
                ? "flex(col) gap(1) padding(4) bg(brand) text-color(ink)"
                : "flex(col) gap(1) padding(4) bg(surface)"
            }
          >
            <span className="font(mono) text-size(xs) opacity(70)">
              {String(index + 1).padStart(2, "0")}
            </span>
            <strong className="text-weight(semibold)">{name}</strong>
            <span className="text-size(xs) opacity(80)">{note}</span>
          </li>
        ))}
      </ol>
      <ul className="display(grid) columns(1) lg:columns(2) column-gap(12) border-top(1,line)">
        {ECOSYSTEM.map(([name, description]) => (
          <li
            key={name}
            className="flex(col) md:flex(row) md:align(center) gap(1) md:gap(4) padding-y(3) border-bottom(1,line) text-size(sm)"
          >
            <code className="font(mono) text-color(fg) md:width[11rem] shrink(0)">{name}</code>
            <span className="text-color(faint)">{description}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FinalCall() {
  const button =
    "padding(3,6) text-weight(semibold) cut(sm) transition(colors) duration(fast) bg(alpha(ink,12)) hover:bg(ink) hover:text-color(fg)";
  return (
    <div className="position(relative) overflow(hidden) bg(brand) text-color(ink)">
      <div aria-hidden="true" className="slashes slashes-ink">
        <i />
        <i />
        <i />
      </div>
      <section
        className={`${container} position(relative) padding-y(20) md:padding-y(32) flex(col) gap(10) align(start)`}
      >
        <h2 className="font(display) stretch(wide) text-size[clamp(3rem,8vw,7.5rem)] text-weight(bold) letter-spacing(tighter) line-height[0.98] max-width[60rem]">
          Try the compiler now.
        </h2>
        <div className="flex(row) flex-wrap(wrap) gap(3)">
          <Link
            href="/playground"
            className="padding(3,6) bg(ink) text-color(fg) text-weight(semibold) cut(sm) transition(colors) duration(fast) hover:bg(raised)"
          >
            Open the playground
          </Link>
          <Link href="/docs/getting-started/installation" className={button}>
            Get started
          </Link>
          <Link href="/docs/community/contributing" className={button}>
            Contribute
          </Link>
        </div>
      </section>
    </div>
  );
}

export function Landing() {
  return (
    <main id="main-content">
      <Hero />
      <Bench />
      <Anatomy />
      <Reasons />
      <Components />
      <Compare />
      <div className="border-top(1,line)">
        <Guarantees />
      </div>
      <Install />
      <Ecosystem />
      <FinalCall />
    </main>
  );
}
