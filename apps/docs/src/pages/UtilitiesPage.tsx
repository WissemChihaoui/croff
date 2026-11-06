import { builtinUtilities, createCroff, stateVariants, type UtilityDefinition } from "@croff/core";
import { CodeBlock } from "../components/Code";
import { DocsLayout } from "../components/DocsLayout";
import {
  breakpointVariantList,
  describeArguments,
  generatedCss,
  signatures,
  themeScales,
  usageExamples,
} from "../lib/reference";
import type { Heading } from "../lib/markdown";
import type { NavPage } from "../nav";
import { Link } from "../router";

const engine = createCroff();

function UtilityEntry({ utility }: { utility: UtilityDefinition }) {
  const args = describeArguments(utility, engine.theme);
  const scales = themeScales(utility, engine.theme);
  const usage = usageExamples(utility);
  return (
    <section className="padding-top(8) margin-top(10) border-top(1,line)">
      <h2
        id={utility.name}
        className="font(mono) text-size(xl) text-weight(semibold) text-color(brand)"
      >
        <a href={`#${utility.name}`}>{utility.name}</a>
      </h2>
      <p className="margin-top(2) text-color(soft) line-height(relaxed)">{utility.description}</p>

      <h3 className="margin-top(5) font(mono) text-size(xs) text-color(faint) text-transform(uppercase) letter-spacing(wider)">
        Syntax
      </h3>
      <CodeBlock code={signatures(utility).join("\n")} language="text" label="syntax" />

      {args.length > 0 && (
        <>
          <h3 className="margin-top(5) font(mono) text-size(xs) text-color(faint) text-transform(uppercase) letter-spacing(wider)">
            Accepted values
          </h3>
          <div className="prose margin-top(3)">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Argument</th>
                    <th>Type</th>
                    <th>Values</th>
                  </tr>
                </thead>
                <tbody>
                  {args.flatMap((arg) =>
                    arg.types.map((type, index) => (
                      <tr key={`${arg.name}-${type.label}-${index}`}>
                        <td>
                          {index === 0 && (
                            <code>
                              {arg.name}
                              {arg.optional ? "?" : ""}
                              {arg.variadic ? "…" : ""}
                            </code>
                          )}
                        </td>
                        <td className="whitespace(nowrap)">{type.label}</td>
                        <td>
                          {type.values ? (
                            <span className="font(mono) text-size(xs)">
                              {type.values.join("  ")}
                            </span>
                          ) : (
                            <span className="text-color(faint)">See type</span>
                          )}
                        </td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <h3 className="margin-top(5) font(mono) text-size(xs) text-color(faint) text-transform(uppercase) letter-spacing(wider)">
        Examples and generated CSS
      </h3>
      <CodeBlock code={utility.examples.join("\n")} language="croff" label="expressions" />
      <CodeBlock
        code={generatedCss(engine, utility.examples)}
        language="css"
        label="Generated CSS"
      />

      <h3 className="margin-top(5) font(mono) text-size(xs) text-color(faint) text-transform(uppercase) letter-spacing(wider)">
        Theme behavior
      </h3>
      <p className="margin-top(2) text-size(sm) text-color(soft) line-height(relaxed)">
        {scales.length > 0 ? (
          <>
            Reads tokens from{" "}
            <code className="font(mono) text-size(xs) text-color(fg)">{scales.join(", ")}</code>. A
            token compiles to its custom property, so changing it in your theme changes every use.
          </>
        ) : (
          "This utility uses fixed keywords and numbers, and reads nothing from the theme."
        )}
        {utility.notes ? ` ${utility.notes}` : ""}
      </p>

      <h3 className="margin-top(5) font(mono) text-size(xs) text-color(faint) text-transform(uppercase) letter-spacing(wider)">
        Responsive and state usage
      </h3>
      <CodeBlock code={usage.join("\n")} language="croff" label="expressions" />
    </section>
  );
}

function Interactions() {
  const breakpoints = breakpointVariantList(engine.theme);
  return (
    <>
      <p className="text-size(lg) text-color(soft) line-height(snug)">
        Variants apply any utility conditionally. Write them before the utility, separated by
        colons, and stack as many as you need. See{" "}
        <Link href="/docs/concepts/variants" className="text-decoration(underline)">
          Variants
        </Link>{" "}
        for how they compose and order.
      </p>
      {stateVariants.map((variant) => (
        <section key={variant.name} className="padding-top(8) margin-top(10) border-top(1,line)">
          <h2
            id={variant.name}
            className="font(mono) text-size(xl) text-weight(semibold) text-color(brand)"
          >
            <a href={`#${variant.name}`}>{variant.name}:</a>
          </h2>
          <p className="margin-top(2) text-color(soft)">{variant.description}</p>
          <CodeBlock code={`${variant.name}:bg(brand)`} language="croff" label="expression" />
          <CodeBlock
            code={generatedCss(engine, [`${variant.name}:bg(brand)`])}
            language="css"
            label="Generated CSS"
          />
          {variant.name === "group-hover" && (
            <p className="margin-top(2) text-size(sm) text-color(soft)">
              Put the plain class <code className="font(mono) text-color(fg)">group</code> on the
              ancestor. It generates no CSS of its own.
            </p>
          )}
        </section>
      ))}
      <section className="padding-top(8) margin-top(10) border-top(1,line)">
        <h2
          id="breakpoints"
          className="font(mono) text-size(xl) text-weight(semibold) text-color(brand)"
        >
          <a href="#breakpoints">Breakpoints</a>
        </h2>
        <p className="margin-top(2) text-color(soft)">
          One responsive variant exists for each token in your theme's{" "}
          <code className="font(mono) text-color(fg)">breakpoints</code> scale.
        </p>
        <div className="prose margin-top(3)">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Variant</th>
                  <th>Applies at</th>
                </tr>
              </thead>
              <tbody>
                {breakpoints.map((breakpoint) => (
                  <tr key={breakpoint.name}>
                    <td>
                      <code>{breakpoint.name}:</code>
                    </td>
                    <td>{breakpoint.atRule}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}

export function UtilitiesPage({ page }: { page: NavPage }) {
  const utilities = builtinUtilities.filter((utility) => utility.category === page.category);
  const interactions = page.category === "interactions";
  const headings: Heading[] = interactions
    ? [
        ...stateVariants.map((variant) => ({
          id: variant.name,
          text: `${variant.name}:`,
          level: 2,
        })),
        { id: "breakpoints", text: "Breakpoints", level: 2 },
      ]
    : utilities.map((utility) => ({ id: utility.name, text: utility.name, level: 2 }));

  return (
    <DocsLayout page={page} headings={headings}>
      <header className="flex(col) gap(3) margin-bottom(4)">
        <p className="font(mono) text-size(xs) text-color(faint)">Generated from the registry</p>
        <h1 className="font(display) stretch(wide) text-size(3xl) md:text-size(4xl) text-weight(bold) letter-spacing(tight) line-height(tight)">
          {page.title}
        </h1>
      </header>
      {interactions ? (
        <Interactions />
      ) : (
        utilities.map((utility) => <UtilityEntry key={utility.name} utility={utility} />)
      )}
    </DocsLayout>
  );
}
