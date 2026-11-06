/**
 * A small, opinionated reset, emitted only for `@croff reset;`. It removes the
 * browser defaults that most often fight utility classes.
 */
export const RESET_CSS = `*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
}

html {
  line-height: 1.5;
  -webkit-text-size-adjust: 100%;
}

img, picture, video, canvas, svg {
  display: block;
  max-width: 100%;
}

input, button, textarea, select {
  font: inherit;
  color: inherit;
}

button {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

button:disabled {
  cursor: default;
}

a {
  color: inherit;
  text-decoration: inherit;
}

p, h1, h2, h3, h4, h5, h6 {
  overflow-wrap: break-word;
}

h1, h2, h3, h4, h5, h6 {
  font-size: inherit;
  font-weight: inherit;
}

ol, ul {
  list-style: none;
  padding: 0;
}
`;
