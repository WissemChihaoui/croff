/**
 * The code shown beside each component in the gallery. The HTML is built by the recipes, so its
 * class names are always the real ones. This is a .ts file because the site's content patterns
 * only cover .tsx, and these classes are in the prebuilt stylesheet already.
 */
import * as ui from "@croff/ui";

export interface ComponentSample {
  id: string;
  title: string;
  description: string;
  react: string;
  html?: string;
}

export const SAMPLES: ComponentSample[] = [
  {
    id: "button",
    title: "Button",
    description:
      "Cut corners on anything you can press. Give it an href and it renders a link. While loading, it's disabled and announces that it's busy.",
    react: `<Button>Save</Button>
<Button tone="secondary" size="sm">Cancel</Button>
<Button tone="danger">Delete</Button>
<Button href="/docs">Read the docs</Button>
<Button loading>Saving</Button>`,
    html: `<button type="button" class="${ui.button()}">Save</button>`,
  },
  {
    id: "badge",
    title: "Badge",
    description: "A short status label, led by the logo's slash.",
    react: `<Badge tone="success">Passing</Badge>`,
    html: `<span class="${ui.badge({ tone: "success" })}">Passing</span>`,
  },
  {
    id: "card",
    title: "Card",
    description: "A hairline panel with a lime tab on its corner.",
    react: `<Card title="Design tokens">
  <CardBody>Change a token and every use follows.</CardBody>
</Card>`,
    html: `<div class="${ui.card()}">
  <h3 class="${ui.cardTitle()}">Design tokens</h3>
  <p class="${ui.cardBody()}">Change a token and every use follows.</p>
</div>`,
  },
  {
    id: "alert",
    title: "Alert",
    description:
      'A message on the page. Add role="alert" when it appears after something happens, so that screen readers announce it.',
    react: `<Alert tone="danger" title="The build failed" role="alert">
  Two expressions couldn't be compiled.
</Alert>`,
    html: `<div class="${ui.alert({ tone: "danger" })}" role="alert">
  <p class="${ui.alertTitle()}">The build failed</p>
  Two expressions couldn't be compiled.
</div>`,
  },
  {
    id: "field",
    title: "Field, input, textarea and select",
    description:
      "Field connects a label, one control and its hint or error for screen readers, and marks the control invalid when there's an error.",
    react: `<Field label="Email" hint="We'll only use it to reply.">
  <Input type="email" />
</Field>
<Field label="Name" error="Enter your name.">
  <Input />
</Field>
<Field label="Plan">
  <Select><option>Free</option></Select>
</Field>`,
    html: `<div class="${ui.field()}">
  <label for="email" class="${ui.label()}">Email</label>
  <input id="email" type="email" aria-describedby="email-hint" class="${ui.input()}" />
  <p id="email-hint" class="${ui.hint()}">We'll only use it to reply.</p>
</div>`,
  },
  {
    id: "choices",
    title: "Checkbox, radio and switch",
    description:
      "Real form controls. A checked checkbox shows the slash, radio buttons are diamonds, and a switch's thumb is a slash that slides across.",
    react: `<Checkbox label="Send me updates" defaultChecked />
<Radio label="Monthly" name="billing" defaultChecked />
<Switch label="Dark mode" defaultChecked />`,
    html: `<label class="${ui.choice()}">
  <input type="checkbox" class="${ui.checkbox()}" /> Send me updates
</label>
<label class="${ui.choice()}">
  <input type="checkbox" role="switch" class="${ui.switchControl()}" /> Dark mode
</label>`,
  },
  {
    id: "tabs",
    title: "Tabs",
    description:
      "The arrow keys, Home and End move between tabs. In React this is handled for you. Without React, you write that behavior and switch the panels yourself.",
    react: `<Tabs
  label="Output"
  items={[
    { id: "css", label: "CSS", content: "The generated stylesheet." },
    { id: "map", label: "Source map", content: "Where each rule came from." },
  ]}
/>`,
    html: `<div role="tablist" aria-label="Output" class="${ui.tabList()}">
  <button type="button" role="tab" aria-selected="true" class="${ui.tab()}">CSS</button>
</div>
<div role="tabpanel" tabindex="0" class="${ui.tabPanel()}">The generated stylesheet.</div>`,
  },
  {
    id: "dialog",
    title: "Dialog",
    description:
      "Built on the native dialog element, which keeps focus inside, restores it afterwards and closes on Escape. In React, clicking outside closes it too.",
    react: `const [open, setOpen] = useState(false);

<Button onClick={() => setOpen(true)}>Delete project</Button>
<Dialog
  open={open}
  onClose={() => setOpen(false)}
  title="Delete this project?"
  actions={<Button onClick={() => setOpen(false)}>Keep it</Button>}
>
  This can't be undone.
</Dialog>`,
    html: `<dialog class="${ui.dialog()}">
  <h2 class="${ui.dialogTitle()}">Delete this project?</h2>
  <p class="${ui.dialogBody()}">This can't be undone.</p>
</dialog>`,
  },
  {
    id: "accordion",
    title: "Accordion",
    description:
      "Built on the native details element, so it works without JavaScript. Its slash lies flat when an item opens.",
    react: `<Accordion
  exclusive
  items={[
    { id: "a", summary: "Does it need a runtime?", content: "No. It's plain CSS." },
  ]}
/>`,
    html: `<details class="${ui.accordionItem()}">
  <summary class="${ui.accordionSummary()}">
    Does it need a runtime?
    <span aria-hidden="true" class="${ui.accordionMarker()}"></span>
  </summary>
  <div class="${ui.accordionBody()}">No. It's plain CSS.</div>
</details>`,
  },
  {
    id: "progress",
    title: "Progress, spinner and skeleton",
    description:
      "A slanted bar, a slash that sweeps across its track, and a placeholder for loading content. Their motion stops for visitors who ask for less of it.",
    react: `<Progress value={64} label="Uploading" />
<Spinner label="Loading results" />
<Skeleton className="width(full)" />`,
    html: `<div role="progressbar" aria-label="Uploading" aria-valuemin="0" aria-valuemax="100" aria-valuenow="64" class="${ui.progress()}">
  <span class="${ui.progressBar()}" style="width: 64%"></span>
</div>
<span role="status" aria-label="Loading results" class="${ui.spinner()}"></span>`,
  },
  {
    id: "avatar",
    title: "Avatar",
    description: "A person's picture, or their initials when there isn't one.",
    react: `<Avatar name="Ada Lovelace" />
<Avatar name="Ada Lovelace" src="/ada.jpg" size="lg" />`,
    html: `<span role="img" aria-label="Ada Lovelace" class="${ui.avatar()}">
  <span aria-hidden="true">AL</span>
</span>`,
  },
  {
    id: "table",
    title: "Table",
    description: "Mono headers, and a scroll that the keyboard can reach when the table is wide.",
    react: `<Table
  caption="Packages"
  columns={[
    { key: "name", label: "Name" },
    { key: "job", label: "Job" },
  ]}
  rows={[{ id: "1", name: "@croff/parser", job: "Reads the grammar" }]}
/>`,
    html: `<div tabindex="0" class="${ui.tableWrap()}">
  <table class="${ui.table()}">
    <thead>
      <tr><th scope="col" class="${ui.tableHeader()}">Name</th></tr>
    </thead>
    <tbody>
      <tr class="${ui.tableRow()}"><td class="${ui.tableCell()}">@croff/parser</td></tr>
    </tbody>
  </table>
</div>`,
  },
  {
    id: "type",
    title: "Heading, eyebrow and keyboard key",
    description:
      "The system's type: wide display headings, mono labels led by the slash, and keys. Load Archivo and JetBrains Mono for the exact look, or override the font tokens.",
    react: `<Eyebrow>Getting started</Eyebrow>
<Heading level={2} size="lg">Style without the noise.</Heading>
<Kbd>Ctrl</Kbd> <Kbd>K</Kbd>`,
    html: `<p class="${ui.eyebrow()}">Getting started</p>
<h2 class="${ui.heading({ size: "lg" })}">Style without the noise.</h2>
<kbd class="${ui.kbd()}">Ctrl</kbd>`,
  },
];
