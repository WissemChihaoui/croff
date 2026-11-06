/**
 * External links the project hasn't confirmed yet stay `null`. Anything that
 * depends on one is rendered as plain text, so that the site never links to a
 * made-up address. Set these once the repository and packages are public.
 */
export const site = {
  name: "CROFF",
  version: "0.1.0",
  githubUrl: null as string | null,
  /** False until the packages are published to a registry. */
  published: false,
};
