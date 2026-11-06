import { useState } from "react";

// Complete expressions in the source: CROFF scans text and never runs your code.
const variants = {
  brand: "bg(brand) color(dark) hover:bg(brand-dark)",
  ghost: "border(1,gray-700) color(light) hover:border-color(brand)",
};

function Button({
  kind,
  children,
  onClick,
}: {
  kind: keyof typeof variants;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`padding(2,4) radius(sm) text-weight(medium) transition(colors) focus-visible:ring(2,light) ${variants[kind]}`}
    >
      {children}
    </button>
  );
}

export function App() {
  const [count, setCount] = useState(0);
  return (
    <main className="bg(dark) color(light) font(sans) min-height(screen) flex(col) align(center) justify(center) gap(6) padding(6)">
      <h1 className="text-size(3xl) md:text-size(5xl) text-weight(bold) letter-spacing(tight)">
        React + <span className="color(brand)">CROFF</span>
      </h1>
      <div className="bg(surface) border(1,gray-800) radius(lg) padding(6) flex(col) align(center) gap(4)">
        <p data-testid="count" className="font(mono) text-size(4xl)">
          {count}
        </p>
        <div className="flex(row) gap(2)">
          <Button kind="brand" onClick={() => setCount(count + 1)}>
            Increment
          </Button>
          <Button kind="ghost" onClick={() => setCount(0)}>
            Reset
          </Button>
        </div>
      </div>
    </main>
  );
}
