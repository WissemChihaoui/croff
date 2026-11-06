import { useEffect, useMemo, useState } from "react";
import { CodeBlock, CodeEditor, PreviewFrame } from "../components/Code";
import { compileMarkup } from "../lib/engine";
import { PRESETS } from "../lib/samples";

const DEFAULT_THEME = {
  colors: { brand: "#c8fd12", "brand-dark": "#a4d30b", dark: "#0a0a0a", light: "#f5f2f1" },
  spacing: { 4: "1rem", 6: "1.5rem" },
  radius: { sm: "0.25rem", md: "0.5rem", lg: "0.75rem" },
};

type ThemeState = typeof DEFAULT_THEME;
type Scale = keyof ThemeState;

const VIEWPORTS = [
  { label: "Full", width: "100%" },
  { label: "lg 1024", width: "1024px" },
  { label: "md 768", width: "768px" },
  { label: "sm 640", width: "640px" },
  { label: "390", width: "390px" },
];

interface Shared {
  markup: string;
  theme: ThemeState;
}

function readShared(): Shared | undefined {
  try {
    const hash = window.location.hash.slice(1);
    if (!hash) return undefined;
    const text = new TextDecoder().decode(Uint8Array.from(atob(hash), (ch) => ch.charCodeAt(0)));
    const data = JSON.parse(text) as Partial<Shared>;
    if (typeof data.markup !== "string") return undefined;
    return { markup: data.markup, theme: { ...DEFAULT_THEME, ...data.theme } };
  } catch {
    return undefined;
  }
}

function encodeShared(shared: Shared): string {
  const bytes = new TextEncoder().encode(JSON.stringify(shared));
  return btoa(String.fromCharCode(...bytes));
}

function TokenEditor({
  theme,
  onChange,
}: {
  theme: ThemeState;
  onChange: (scale: Scale, token: string, value: string) => void;
}) {
  return (
    <div className="flex(col) gap(4) padding(4)">
      {(Object.keys(theme) as Scale[]).map((scale) => (
        <fieldset key={scale} className="flex(col) gap(2)">
          <legend className="font(mono) text-size(xs) text-color(faint) margin-bottom(2)">
            {scale}
          </legend>
          {Object.entries(theme[scale]).map(([token, value]) => (
            <label
              key={token}
              className="display(grid) columns[7rem_1fr] align(center) gap(2) text-size(xs) font(mono) text-color(soft)"
            >
              {token}
              <span className="flex(row) align(center) gap(2)">
                {scale === "colors" && (
                  <input
                    type="color"
                    aria-label={`${token} color picker`}
                    value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
                    onChange={(event) => onChange(scale, token, event.target.value)}
                    className="width(6) height(6) bg(transparent) cursor(pointer) shrink(0)"
                  />
                )}
                <input
                  value={value}
                  aria-label={`${scale} ${token}`}
                  spellCheck={false}
                  onChange={(event) => onChange(scale, token, event.target.value)}
                  className="width(full) min-width(0) bg(ink) border(1,line) radius[0.125rem] padding(1,2) text-color(fg) focus:border-color(brand) focus:outline(none)"
                />
              </span>
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}

const paneTitle = "font(mono) text-size(xs) text-color(faint)";

export function Playground() {
  const [markup, setMarkup] = useState(PRESETS["Card"]!);
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [viewport, setViewport] = useState(VIEWPORTS[0]!);
  const [panel, setPanel] = useState<"css" | "tokens">("css");
  const [shareLabel, setShareLabel] = useState("Share");

  useEffect(() => {
    const shared = readShared();
    if (shared) {
      setMarkup(shared.markup);
      setTheme(shared.theme);
    }
  }, []);

  const result = useMemo(() => compileMarkup(markup, { theme }), [markup, theme]);

  const setToken = (scale: Scale, token: string, value: string) => {
    setTheme((current) => ({ ...current, [scale]: { ...current[scale], [token]: value } }));
  };

  const share = () => {
    const url = `${window.location.origin}/playground#${encodeShared({ markup, theme })}`;
    window.history.replaceState(null, "", url);
    const report = (label: string) => {
      setShareLabel(label);
      window.setTimeout(() => setShareLabel("Share"), 1500);
    };
    // The link is in the address bar either way.
    navigator.clipboard.writeText(url).then(
      () => report("Link copied"),
      () => report("Link in address bar"),
    );
  };

  const problemCount = result.problems.length + result.themeIssues.length;
  const tab = (active: boolean) =>
    active
      ? "font(mono) text-size(xs) text-color(fg) border-bottom(2,brand) padding-y(2)"
      : "font(mono) text-size(xs) text-color(faint) hover:text-color(fg) border-bottom(2,transparent) padding-y(2)";

  return (
    <main
      id="content"
      className="grow(1) flex(col) lg:height[calc(100vh-3.5rem)] lg:overflow(hidden)"
    >
      <h1 className="position(absolute) width(px) height(px) overflow(hidden)">CROFF playground</h1>

      <div className="flex(row) flex-wrap(wrap) align(center) gap(2) padding(2,4) border-bottom(1,line)">
        <span className={`${paneTitle} margin-right(2)`}>Presets</span>
        {Object.keys(PRESETS).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setMarkup(PRESETS[name]!)}
            className={
              markup === PRESETS[name]
                ? "padding(1,3) text-size(xs) text-weight(semibold) bg(brand) text-color(ink) cut(sm)"
                : "padding(1,3) text-size(xs) bg(raised) text-color(soft) cut(sm) transition(colors) duration(fast) hover:text-color(fg)"
            }
          >
            {name}
          </button>
        ))}
        <div className="margin-left(auto) flex(row) align(center) gap(3)">
          <span className={paneTitle}>
            {result.ruleCount} rules
            {problemCount > 0 && (
              <span className="text-color(red)"> / {problemCount} problems</span>
            )}
          </span>
          <button
            type="button"
            onClick={share}
            className="padding(1,3) text-size(xs) bg(raised) text-color(soft) cut(sm) transition(colors) duration(fast) hover:bg(brand) hover:text-color(ink)"
          >
            {shareLabel}
          </button>
        </div>
      </div>

      <div className="grow(1) min-height(0) display(grid) columns(1) lg:columns(2) lg:rows(2) grid-flow(row)">
        <section
          aria-label="Markup"
          className="flex(col) min-height(0) height[22rem] lg:height(auto) border-bottom(1,line) lg:border-right(1,line)"
        >
          <div className="padding(2,4) border-bottom(1,line)">
            <h2 className={paneTitle}>Markup</h2>
          </div>
          <CodeEditor
            value={markup}
            onChange={setMarkup}
            language="html"
            label="Markup"
            className="grow(1) min-height(0) bg(surface)"
          />
        </section>

        <section
          aria-label="Preview"
          className="flex(col) min-height(0) height[24rem] lg:height(auto) border-bottom(1,line)"
        >
          <div className="flex(row) flex-wrap(wrap) align(center) justify(between) gap(2) padding(1,4) border-bottom(1,line)">
            <h2 className={paneTitle}>Preview</h2>
            <div className="flex(row) gap(3)">
              {VIEWPORTS.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setViewport(option)}
                  className={tab(viewport.label === option.label)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grow(1) min-height(0) overflow(auto) bg[#050505] flex(row) justify(center)">
            <div
              style={{ width: viewport.width, maxWidth: "100%" }}
              className="height(full) shrink(0)"
            >
              <PreviewFrame
                title="Preview of the markup"
                markup={markup}
                css={result.css}
                className="width(full) height(full) border(none) display(block)"
              />
            </div>
          </div>
        </section>

        <section
          aria-label="Output"
          className="flex(col) min-height(0) height[24rem] lg:height(auto) border-bottom(1,line) lg:border-bottom(none) lg:border-right(1,line)"
        >
          <div className="flex(row) align(center) gap(4) padding-x(4) border-bottom(1,line)">
            <button type="button" onClick={() => setPanel("css")} className={tab(panel === "css")}>
              Generated CSS
            </button>
            <button
              type="button"
              onClick={() => setPanel("tokens")}
              className={tab(panel === "tokens")}
            >
              Theme tokens
            </button>
          </div>
          <div className="flush grow(1) min-height(0) overflow(auto) bg(surface)">
            {panel === "css" ? (
              <CodeBlock
                code={result.displayCss || "/* Nothing generated yet */"}
                language="css"
                label="Output of @croff/core, running in this tab"
              />
            ) : (
              <TokenEditor theme={theme} onChange={setToken} />
            )}
          </div>
        </section>

        <section
          aria-label="Problems"
          className="flex(col) min-height(0) height[16rem] lg:height(auto)"
        >
          <div className="padding(2,4) border-bottom(1,line)">
            <h2 className={paneTitle}>Problems</h2>
          </div>
          <ul className="grow(1) min-height(0) overflow(auto) flex(col) text-size(sm)">
            {problemCount === 0 && (
              <li className="padding(4) text-color(faint)">
                No problems. Every expression compiled.
              </li>
            )}
            {result.themeIssues.map((issue) => (
              <li
                key={issue.message}
                className="padding(3,4) border-bottom(1,line) text-color(soft)"
              >
                <span className="font(mono) text-size(xs) text-color(red)">{issue.code}</span>
                <p>{issue.message}</p>
              </li>
            ))}
            {result.problems.map((problem) => (
              <li
                key={`${problem.expression}${problem.message}`}
                className="padding(3,4) border-bottom(1,line) flex(col) gap(1)"
              >
                {problem.expression && (
                  <code className="font(mono) text-size(xs) text-color(fg)">
                    {problem.expression}
                  </code>
                )}
                <p
                  className={
                    problem.severity === "error" ? "text-color(soft)" : "text-color(amber)"
                  }
                >
                  {problem.message}
                </p>
                {problem.hint && <p className="text-color(faint) text-size(xs)">{problem.hint}</p>}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
