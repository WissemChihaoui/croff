import { page as pageRecipe } from "@croff/ui";
import {
  Accordion,
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  Checkbox,
  Dialog,
  Eyebrow,
  Field,
  Heading,
  Input,
  Kbd,
  Progress,
  Radio,
  Select,
  Skeleton,
  Spinner,
  Switch,
  Table,
  Tabs,
  Textarea,
} from "@croff/ui/react";
import { useState, type ReactNode } from "react";
import { CodeBlock } from "../components/Code";
import { DocsLayout } from "../components/DocsLayout";
import { SAMPLES } from "../lib/component-samples";
import type { Heading as PageHeading } from "../lib/markdown";
import type { NavPage } from "../nav";

function DialogDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button tone="danger" onClick={() => setOpen(true)}>
        Delete project
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this project?"
        actions={
          <>
            <Button tone="ghost" onClick={() => setOpen(false)}>
              Keep it
            </Button>
            <Button tone="danger" onClick={() => setOpen(false)}>
              Delete
            </Button>
          </>
        }
      >
        This can't be undone. Press Escape or click outside to close this.
      </Dialog>
    </>
  );
}

const row = "flex(row) flex-wrap(wrap) align(center) gap(3)";
const stack = "flex(col) gap(4)";

const DEMOS: Record<string, ReactNode> = {
  button: (
    <div className={stack}>
      <div className={row}>
        <Button>Primary</Button>
        <Button tone="secondary">Secondary</Button>
        <Button tone="ghost">Ghost</Button>
        <Button tone="danger">Danger</Button>
      </div>
      <div className={row}>
        <Button size="sm">Small</Button>
        <Button>Medium</Button>
        <Button size="lg">Large</Button>
      </div>
      <div className={row}>
        <Button disabled>Disabled</Button>
        <Button loading>Saving</Button>
        <Button tone="secondary" href="#button">
          A link
        </Button>
      </div>
    </div>
  ),
  badge: (
    <div className={row}>
      <Badge>Neutral</Badge>
      <Badge tone="brand">Brand</Badge>
      <Badge tone="success">Success</Badge>
      <Badge tone="warning">Warning</Badge>
      <Badge tone="danger">Danger</Badge>
      <Badge tone="info">Info</Badge>
    </div>
  ),
  card: (
    <div className="display(grid) columns(1) sm:columns(2) gap(3)">
      <Card title="Design tokens">
        <CardBody>Change a token and every use follows.</CardBody>
      </Card>
      <Card interactive title="An interactive card">
        <CardBody>Its border lights up when you point at it.</CardBody>
      </Card>
    </div>
  ),
  alert: (
    <div className={stack}>
      <Alert title="A note">Neutral, for anything worth saying.</Alert>
      <Alert tone="success" title="Build finished">
        Generated 42 rules.
      </Alert>
      <Alert tone="warning" title="Built at runtime">
        CROFF can't see a class name that's put together at runtime.
      </Alert>
      <Alert tone="danger" title="The build failed">
        Two expressions couldn't be compiled.
      </Alert>
      <Alert tone="info" title="Pre-release">
        This version isn't on a package registry yet.
      </Alert>
    </div>
  ),
  field: (
    <div className="display(grid) columns(1) sm:columns(2) gap(4)">
      <Field label="Email" hint="We'll only use it to reply.">
        <Input type="email" placeholder="you@example.com" />
      </Field>
      <Field label="Name" error="Enter your name.">
        <Input />
      </Field>
      <Field label="Plan">
        <Select defaultValue="team">
          <option value="free">Free</option>
          <option value="team">Team</option>
        </Select>
      </Field>
      <Field label="Disabled">
        <Input disabled defaultValue="You can't change this" />
      </Field>
      <Field label="Message" className="sm:grid-span(2)">
        <Textarea placeholder="Tell us what you're building." />
      </Field>
    </div>
  ),
  choices: (
    <div className="display(grid) columns(1) sm:columns(3) gap(4)">
      <div className={stack}>
        <Checkbox label="Checked" defaultChecked />
        <Checkbox label="Not checked" />
        <Checkbox label="Disabled" disabled />
      </div>
      <div className={stack}>
        <Radio label="Monthly" name="gallery-billing" defaultChecked />
        <Radio label="Yearly" name="gallery-billing" />
        <Radio label="Disabled" name="gallery-billing" disabled />
      </div>
      <div className={stack}>
        <Switch label="On" defaultChecked />
        <Switch label="Off" />
        <Switch label="Disabled" disabled />
      </div>
    </div>
  ),
  tabs: (
    <Tabs
      label="Output"
      items={[
        { id: "css", label: "CSS", content: "The generated stylesheet." },
        { id: "map", label: "Source map", content: "Where each rule came from." },
        { id: "report", label: "Report", content: "What was compiled, and what wasn't." },
      ]}
    />
  ),
  dialog: <DialogDemo />,
  accordion: (
    <Accordion
      exclusive
      items={[
        {
          id: "runtime",
          summary: "Does it need a runtime?",
          content: "The styles are plain CSS. The class functions are small, and optional.",
        },
        {
          id: "react",
          summary: "Do I need React?",
          content: "No. Every component is also a function that returns its class names.",
        },
        {
          id: "theme",
          summary: "Can I change the colors?",
          content: "Yes. Override any token, with no rebuild.",
        },
      ]}
    />
  ),
  progress: (
    <div className={stack}>
      <Progress value={64} label="Example progress" />
      <div className={row}>
        <Spinner label="Example spinner" />
        <span className="text-size(sm) color(soft)">Loading results</span>
      </div>
      <div className="flex(col) gap(2)">
        <Skeleton className="width(full)" />
        <Skeleton className="width[70%]" />
      </div>
    </div>
  ),
  avatar: (
    <div className={row}>
      <Avatar name="Ada Lovelace" size="sm" />
      <Avatar name="Grace Hopper" />
      <Avatar name="Linus" size="lg" />
    </div>
  ),
  table: (
    <Table
      caption="Some of the packages"
      columns={[
        { key: "name", label: "Name" },
        { key: "job", label: "Job" },
      ]}
      rows={[
        { id: "parser", name: "@croff/parser", job: "Reads the grammar" },
        { id: "compiler", name: "@croff/compiler", job: "Orders and prints the CSS" },
        { id: "ui", name: "@croff/ui", job: "These components" },
      ]}
    />
  ),
  type: (
    <div className={stack}>
      <Eyebrow>Getting started</Eyebrow>
      <Heading level={3} size="lg">
        Style without the noise.
      </Heading>
      <p className="margin(0) text-size(sm) color(soft)">
        Press <Kbd>Ctrl</Kbd> <Kbd>K</Kbd> to search.
      </p>
    </div>
  ),
};

const HEADINGS: PageHeading[] = SAMPLES.map(({ id, title }) => ({ id, text: title, level: 2 }));

export function ComponentsPage({ page }: { page: NavPage }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  return (
    <DocsLayout page={page} headings={HEADINGS}>
      <header className="flex(col) gap(4) margin-bottom(6)">
        <h1 className="font(display) stretch(wide) text-size[clamp(2.25rem,5vw,3.5rem)] text-weight(bold) letter-spacing(tighter) line-height[1.04]">
          Component gallery
        </h1>
        <p className="text-size(xl) text-color(soft) line-height(snug)">
          Everything in @croff/ui, live. Try them with a keyboard, too.
        </p>
      </header>
      <div
        role="group"
        aria-label="Theme of the examples"
        className="position(sticky) top[3.5rem] z-index(10) flex(row) align(center) gap(2) padding-y(3) bg(ink) border-bottom(1,line)"
      >
        <span className="font(mono) text-size(xs) text-color(faint) margin-right(2)">Theme</span>
        {(["dark", "light"] as const).map((option) => (
          <Button
            key={option}
            size="sm"
            tone={theme === option ? "primary" : "secondary"}
            aria-pressed={theme === option}
            onClick={() => setTheme(option)}
          >
            {option === "dark" ? "Dark" : "Light"}
          </Button>
        ))}
      </div>
      {SAMPLES.map((sample) => (
        <section key={sample.id} className="padding-top(8) margin-top(10) border-top(1,line)">
          <h2
            id={sample.id}
            className="font(display) stretch(wide) text-size(2xl) text-weight(bold) letter-spacing(tight)"
          >
            <a href={`#${sample.id}`}>{sample.title}</a>
          </h2>
          <p className="margin-top(2) text-color(soft) line-height(relaxed)">
            {sample.description}
          </p>
          <div
            data-theme={theme}
            data-testid={`demo-${sample.id}`}
            className={pageRecipe("margin-top(5) padding(6) border(1,line)")}
          >
            {DEMOS[sample.id]}
          </div>
          <CodeBlock code={sample.react} language="tsx" label="React" />
          {sample.html && (
            <details className="margin-top(2)">
              <summary className="font(mono) text-size(xs) text-color(faint) cursor(pointer) hover:text-color(fg)">
                Without React
              </summary>
              <CodeBlock code={sample.html} language="html" label="HTML" />
            </details>
          )}
        </section>
      ))}
    </DocsLayout>
  );
}
