import type { DocPageData } from "../lib/markdown";

export function DocPage({ data }: { data: DocPageData }) {
  return (
    <>
      <header className="flex(col) gap(3) margin-bottom(8)">
        <h1 className="font(display) stretch(wide) text-size(3xl) md:text-size(4xl) text-weight(bold) letter-spacing(tight) line-height(tight)">
          {data.title}
        </h1>
        {data.description && (
          <p className="text-size(lg) text-color(soft) line-height(snug)">{data.description}</p>
        )}
      </header>
      <div className="prose" dangerouslySetInnerHTML={{ __html: data.html }} />
    </>
  );
}
