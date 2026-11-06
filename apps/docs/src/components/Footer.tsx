import type { ReactNode } from "react";
import { FIRST_DOC } from "../nav";
import { Link } from "../router";
import { site } from "../site.config";

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex(col) gap(3)">
      <h2 className="font(mono) text-size(xs) text-color(faint) text-transform(uppercase) letter-spacing(widest)">
        {title}
      </h2>
      <ul className="flex(col) gap(2) text-size(sm)">{children}</ul>
    </div>
  );
}

function Item({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="text-color(soft) hover:text-color(brand) transition(colors) duration(fast)"
      >
        {children}
      </Link>
    </li>
  );
}

export function Footer() {
  return (
    <footer className="border-top(1,line)">
      <div className="max-width[88rem] margin(0,auto) padding(6) md:padding(10) display(grid) columns(2) md:columns(4) gap(8)">
        <div className="grid-span(2) md:grid-span(1) flex(col) align(start) gap(4)">
          <img
            src="/brand/croff-logo.png"
            alt="CROFF"
            width={1304}
            height={218}
            className="height(6) width(auto)"
          />
          <p className="text-size(sm) text-color(faint) max-width[20rem]">
            An expressive utility-first CSS framework. Version {site.version}, pre-release.
          </p>
        </div>
        <Column title="Learn">
          <Item href={FIRST_DOC}>Documentation</Item>
          <Item href="/docs/getting-started/installation">Getting started</Item>
          <Item href="/docs/utilities/layout">Utilities</Item>
          <Item href="/playground">Playground</Item>
        </Column>
        <Column title="Reference">
          <Item href="/docs/extending/plugin-api">API reference</Item>
          <Item href="/docs/cli/reference">CLI</Item>
          <Item href="/docs/community/changelog">Changelog</Item>
        </Column>
        <Column title="Project">
          <Item href="/docs/community/contributing">Contributing</Item>
          <Item href="/docs/community/code-of-conduct">Code of conduct</Item>
          <Item href="/docs/introduction/roadmap">Roadmap</Item>
          <li className="text-color(soft)">License: MIT</li>
          <li>
            {site.githubUrl ? (
              <a href={site.githubUrl} className="text-color(soft) hover:text-color(brand)">
                GitHub
              </a>
            ) : (
              <span className="text-color(faint)">GitHub: not configured</span>
            )}
          </li>
        </Column>
      </div>
    </footer>
  );
}
