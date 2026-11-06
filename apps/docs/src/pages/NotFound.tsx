import { FIRST_DOC } from "../nav";
import { Link } from "../router";

export function NotFound() {
  return (
    <main
      id="content"
      className="grow(1) flex(col) align(start) justify(center) gap(4) padding(6) md:padding(20) min-height[60vh]"
    >
      <p className="font(mono) text-size(sm) text-color(brand)">404</p>
      <h1 className="font(display) stretch(wide) text-size(4xl) text-weight(bold)">
        This page doesn't exist.
      </h1>
      <Link
        href={FIRST_DOC}
        className="text-color(soft) text-decoration(underline) hover:text-color(brand)"
      >
        Go to the documentation
      </Link>
    </main>
  );
}
