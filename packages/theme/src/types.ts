/** A token value. `null` removes an inherited token. Objects nest: `gray: { 100: "#eee" }` is `gray-100`. */
export type TokenValue = string | number | null | TokenGroup;

export interface TokenGroup {
  [name: string]: TokenValue;
}

/** Built-in scales. Any other key defines a custom scale. */
export interface ThemeConfig {
  colors?: TokenGroup | null;
  spacing?: TokenGroup | null;
  radius?: TokenGroup | null;
  breakpoints?: TokenGroup | null;
  fonts?: TokenGroup | null;
  textSizes?: TokenGroup | null;
  textWeights?: TokenGroup | null;
  lineHeights?: TokenGroup | null;
  letterSpacings?: TokenGroup | null;
  shadows?: TokenGroup | null;
  durations?: TokenGroup | null;
  [scale: string]: TokenGroup | null | undefined;
}

/** A theme with flattened scales. Insertion order is significant and stable. */
export interface ResolvedTheme {
  scales: Record<string, Record<string, string>>;
}

export type ThemeIssueCode = "invalid-token-name" | "invalid-token-value" | "invalid-scale-name";

export interface ThemeIssue {
  code: ThemeIssueCode;
  scale: string;
  token?: string;
  message: string;
}
