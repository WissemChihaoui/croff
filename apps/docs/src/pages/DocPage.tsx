import type { DocPageData } from "../lib/markdown";

export function DocPage({ data }: { data: DocPageData }) {
  return (
    <>
      <header className="flex(col) gap(4) margin-bottom(10)">
        <h1 className="font(display) stretch(wide) text-size[clamp(2.25rem,5vw,3.5rem)] text-weight(bold) letter-spacing(tighter) line-height[1.04]">
          {data.title}
        </h1>
        {data.description && (
          <p className="text-size(xl) text-color(soft) line-height(snug)">{data.description}</p>
        )}
      </header>
      <div className="prose" dangerouslySetInnerHTML={{ __html: data.html }} />
    </>
  );
}
