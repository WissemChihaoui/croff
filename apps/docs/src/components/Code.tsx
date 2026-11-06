import { useRef, type ChangeEvent } from "react";
import { highlight } from "../lib/highlight";

/** Static code with highlighting, and a copy button handled by delegation in App. */
export function CodeBlock({
  code,
  language,
  label,
}: {
  code: string;
  language: string;
  label?: string;
}) {
  return (
    <div className="code-block">
      <div className="code-head">
        <span>{label ?? language}</span>
        <button type="button" className="code-copy" data-copy>
          Copy
        </button>
      </div>
      <pre tabIndex={0}>
        <code dangerouslySetInnerHTML={{ __html: highlight(code, language) }} />
      </pre>
    </div>
  );
}

/** A textarea over a highlighted copy of its text. */
export function CodeEditor({
  value,
  onChange,
  language,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  language: string;
  label: string;
  className?: string;
}) {
  const overlay = useRef<HTMLPreElement>(null);
  return (
    <div className={`editor ${className ?? ""}`}>
      <pre ref={overlay} aria-hidden="true">
        {/* A trailing newline keeps the overlay's height equal to the textarea's. */}
        <code dangerouslySetInnerHTML={{ __html: `${highlight(value, language)}\n` }} />
      </pre>
      <textarea
        aria-label={label}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        value={value}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
        onScroll={(event) => {
          if (overlay.current) {
            overlay.current.scrollTop = event.currentTarget.scrollTop;
            overlay.current.scrollLeft = event.currentTarget.scrollLeft;
          }
        }}
      />
    </div>
  );
}

/** Renders markup and CSS in an isolated, script-free document. */
export function PreviewFrame({
  markup,
  css,
  title,
  className,
}: {
  markup: string;
  css: string;
  title: string;
  className?: string;
}) {
  const document = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{height:100%}
body{background:#0a0a0a;color:#f5f2f1;font-family:ui-sans-serif,system-ui,sans-serif}
${css.replaceAll("</style", "<\\/style")}
</style></head><body>${markup}</body></html>`;
  return <iframe title={title} sandbox="" srcDoc={document} className={className} />;
}
