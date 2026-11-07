import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import * as recipes from "../recipes.js";
import { cx, type ButtonTone, type Size, type Tone } from "../recipes.js";

// ------------------------------------------------------------------ Type

export function Heading({
  level = 2,
  size,
  className,
  ...props
}: ComponentProps<"h2"> & { level?: 1 | 2 | 3 | 4; size?: Size | "xl" }) {
  const Tag = `h${level}` as const;
  return <Tag {...props} className={recipes.heading({ ...(size ? { size } : {}), className })} />;
}

export function Eyebrow({ className, ...props }: ComponentProps<"p">) {
  return <p {...props} className={recipes.eyebrow(className)} />;
}

export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return <kbd {...props} className={recipes.kbd(className)} />;
}

// ------------------------------------------------------------------ Button

interface ButtonStyle {
  tone?: ButtonTone;
  size?: Size;
  block?: boolean;
}

type ButtonProps =
  | (ComponentProps<"button"> & ButtonStyle & { href?: undefined; loading?: boolean })
  | (ComponentProps<"a"> & ButtonStyle & { href: string; loading?: undefined });

/** A button, or a link that looks like one when given an `href`. */
export function Button({ tone, size, block, className, loading, ...props }: ButtonProps) {
  const classes = recipes.button({
    ...(tone ? { tone } : {}),
    ...(size ? { size } : {}),
    ...(block ? { block } : {}),
    className,
  });
  if (props.href !== undefined) {
    return <a {...props} className={classes} />;
  }
  const { children, disabled, ...button } = props;
  return (
    <button
      type="button"
      {...button}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <span aria-hidden="true" className={recipes.spinner({ inherit: true })} />}
      {children}
    </button>
  );
}

// ------------------------------------------------------------------ Badge, card, alert

export function Badge({ tone, className, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return <span {...props} className={recipes.badge({ ...(tone ? { tone } : {}), className })} />;
}

export function Card({
  interactive,
  title,
  children,
  className,
  ...props
}: Omit<ComponentProps<"div">, "title"> & { interactive?: boolean; title?: ReactNode }) {
  return (
    <div
      {...props}
      className={recipes.card({ ...(interactive ? { interactive } : {}), className })}
    >
      {title && <h3 className={recipes.cardTitle()}>{title}</h3>}
      {children}
    </div>
  );
}

export function CardBody({ className, ...props }: ComponentProps<"p">) {
  return <p {...props} className={recipes.cardBody(className)} />;
}

/** A message on the page. Give it role="alert" when it appears after something happens. */
export function Alert({
  tone,
  title,
  children,
  className,
  ...props
}: Omit<ComponentProps<"div">, "title"> & { tone?: Tone; title?: ReactNode }) {
  return (
    <div {...props} className={recipes.alert({ ...(tone ? { tone } : {}), className })}>
      {title && <p className={recipes.alertTitle()}>{title}</p>}
      {children}
    </div>
  );
}

// ------------------------------------------------------------------ Forms

/**
 * A label, one control and its hint or error, connected for screen readers. The control is
 * given an id, `aria-describedby` and `aria-invalid`.
 */
export function Field({
  label,
  hint,
  error,
  children,
  className,
  ...props
}: ComponentProps<"div"> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactElement<ComponentProps<"input">>;
}) {
  const id = useId();
  const control = Children.only(children);
  const controlId = control.props.id ?? `${id}-control`;
  const noteId = hint || error ? `${id}-note` : undefined;
  return (
    <div {...props} className={recipes.field(className)}>
      <label htmlFor={controlId} className={recipes.label()}>
        {label}
      </label>
      {isValidElement(control) &&
        cloneElement(control, {
          id: controlId,
          ...(noteId ? { "aria-describedby": noteId } : {}),
          ...(error ? { "aria-invalid": true } : {}),
        })}
      {error ? (
        <p id={noteId} className={recipes.fieldError()}>
          {error}
        </p>
      ) : (
        hint && (
          <p id={noteId} className={recipes.hint()}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input {...props} className={recipes.input(className)} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea {...props} className={recipes.textarea(className)} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select {...props} className={recipes.select(className)} />;
}

type ChoiceProps = Omit<ComponentProps<"input">, "type"> & { label: ReactNode };

export function Checkbox({ label, className, ...props }: ChoiceProps) {
  return (
    <label className={recipes.choice()}>
      <input {...props} type="checkbox" className={recipes.checkbox(className)} />
      {label}
    </label>
  );
}

export function Radio({ label, className, ...props }: ChoiceProps) {
  return (
    <label className={recipes.choice()}>
      <input {...props} type="radio" className={recipes.radio(className)} />
      {label}
    </label>
  );
}

export function Switch({ label, className, ...props }: ChoiceProps) {
  return (
    <label className={recipes.choice()}>
      <input
        {...props}
        type="checkbox"
        role="switch"
        className={recipes.switchControl(className)}
      />
      {label}
    </label>
  );
}

// ------------------------------------------------------------------ Tabs

export interface TabItem {
  id: string;
  label: ReactNode;
  content: ReactNode;
}

/** Tabs with the standard keyboard behavior: arrow keys, Home and End move between them. */
export function Tabs({
  items,
  label,
  defaultTab,
  className,
  ...props
}: ComponentProps<"div"> & { items: TabItem[]; label: string; defaultTab?: string }) {
  const base = useId();
  const [selected, setSelected] = useState(defaultTab ?? items[0]?.id);
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const last = items.length - 1;
    const next = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const target = items[next]!;
    setSelected(target.id);
    buttons.current.get(target.id)?.focus();
  };

  return (
    <div {...props} className={className}>
      <div role="tablist" aria-label={label} className={recipes.tabList()}>
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`${base}-tab-${item.id}`}
            aria-selected={item.id === selected}
            aria-controls={`${base}-panel-${item.id}`}
            tabIndex={item.id === selected ? 0 : -1}
            ref={(element) => {
              if (element) buttons.current.set(item.id, element);
              else buttons.current.delete(item.id);
            }}
            onClick={() => setSelected(item.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={recipes.tab()}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${base}-panel-${item.id}`}
          aria-labelledby={`${base}-tab-${item.id}`}
          hidden={item.id !== selected}
          tabIndex={0}
          className={recipes.tabPanel()}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ Dialog

/** A modal dialog. The native element keeps focus inside it, restores it and handles Escape. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  actions,
  className,
  ...props
}: Omit<ComponentProps<"dialog">, "title" | "open" | "onClose"> & {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  actions?: ReactNode;
}) {
  const element = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = element.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      {...props}
      ref={element}
      aria-labelledby={titleId}
      onClose={onClose}
      // A click on the backdrop lands on the dialog itself, outside its padding box's content.
      onClick={(event) => {
        if (event.target !== element.current) return;
        const box = element.current.getBoundingClientRect();
        const inside =
          event.clientX >= box.left &&
          event.clientX <= box.right &&
          event.clientY >= box.top &&
          event.clientY <= box.bottom;
        if (!inside) onClose();
      }}
      className={recipes.dialog(className)}
    >
      <h2 id={titleId} className={recipes.dialogTitle()}>
        {title}
      </h2>
      <div className={recipes.dialogBody()}>{children}</div>
      {actions && <div className={recipes.dialogActions()}>{actions}</div>}
    </dialog>
  );
}

// ------------------------------------------------------------------ Accordion

export function Accordion({
  items,
  exclusive,
  className,
  ...props
}: ComponentProps<"div"> & {
  items: { id: string; summary: ReactNode; content: ReactNode }[];
  /** Only one item can be open at a time. */
  exclusive?: boolean;
}) {
  const name = useId();
  return (
    <div {...props} className={cx("border-top(1,line)", className)}>
      {items.map((item) => (
        <details key={item.id} {...(exclusive ? { name } : {})} className={recipes.accordionItem()}>
          <summary className={recipes.accordionSummary()}>
            {item.summary}
            <span aria-hidden="true" className={recipes.accordionMarker()} />
          </summary>
          <div className={recipes.accordionBody()}>{item.content}</div>
        </details>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ Progress and loading

export function Progress({
  value,
  label,
  className,
  ...props
}: ComponentProps<"div"> & { value: number; label: string }) {
  const percent = Math.min(100, Math.max(0, value));
  return (
    <div
      {...props}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={recipes.progress(className)}
    >
      <span className={recipes.progressBar()} style={{ width: `${percent}%` }} />
    </div>
  );
}

export function Spinner({
  label = "Loading",
  className,
  ...props
}: ComponentProps<"span"> & { label?: string }) {
  return (
    <span {...props} role="status" aria-label={label} className={recipes.spinner({ className })} />
  );
}

export function Skeleton({ className, ...props }: ComponentProps<"span">) {
  return <span {...props} aria-hidden="true" className={recipes.skeleton(className)} />;
}

// ------------------------------------------------------------------ Avatar

function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  return `${words[0]?.[0] ?? ""}${words.length > 1 ? (words.at(-1)?.[0] ?? "") : ""}`;
}

export function Avatar({
  name,
  src,
  size,
  className,
  ...props
}: ComponentProps<"span"> & { name: string; src?: string; size?: Size }) {
  const classes = recipes.avatar({ ...(size ? { size } : {}), className });
  return src ? (
    <span {...props} className={classes}>
      <img src={src} alt={name} className={recipes.avatarImage()} />
    </span>
  ) : (
    <span {...props} role="img" aria-label={name} className={classes}>
      <span aria-hidden="true">{initials(name)}</span>
    </span>
  );
}

// ------------------------------------------------------------------ Table

export function Table({
  caption,
  columns,
  rows,
  className,
  ...props
}: ComponentProps<"div"> & {
  caption?: ReactNode;
  columns: { key: string; label: ReactNode }[];
  rows: (Record<string, ReactNode> & { id: string })[];
}) {
  return (
    // A wide table scrolls, so it has to be reachable from the keyboard.
    <div {...props} tabIndex={0} className={recipes.tableWrap(className)}>
      <table className={recipes.table()}>
        {caption && <caption className={recipes.tableCaption()}>{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={recipes.tableHeader()}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={recipes.tableRow()}>
              {columns.map((column) => (
                <td key={column.key} className={recipes.tableCell()}>
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
