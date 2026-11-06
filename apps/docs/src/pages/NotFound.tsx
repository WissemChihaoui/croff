import { FIRST_DOC } from "../nav";
import { Link } from "../router";

export function NotFound() {
  return (
    <main
      id="content"
      className="grow(1) max-width[88rem] width(full) margin-x(auto) flex(col) align(start) justify(center) gap(6) padding-x(5) md:padding-x(10) padding-y(16) min-height[70vh]"
    >
      <p
        aria-hidden="true"
        className="font(display) stretch(wide) text-size[clamp(6rem,22vw,18rem)] text-weight(bold) text-color(brand) letter-spacing(tighter) line-height(none)"
      >
        404
      </p>
      <h1 className="font(display) stretch(wide) text-size[clamp(1.75rem,4vw,3rem)] text-weight(bold) letter-spacing(tight) line-height(tight)">
        This page doesn't exist.
      </h1>
      <Link
        href={FIRST_DOC}
        className="padding(3,6) bg(raised) text-weight(medium) cut(sm) transition(colors) duration(fast) hover:bg(brand) hover:text-color(ink)"
      >
        Go to the documentation
      </Link>
    </main>
  );
}
