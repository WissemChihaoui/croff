const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function encodeVlq(value: number): string {
  let vlq = value < 0 ? (-value << 1) | 1 : value << 1;
  let out = "";
  do {
    let digit = vlq & 31;
    vlq >>>= 5;
    if (vlq > 0) digit |= 32;
    out += BASE64[digit];
  } while (vlq > 0);
  return out;
}

/** A position in generated CSS mapped to a position in a source file. Zero-based. */
export interface Mapping {
  generatedLine: number;
  generatedColumn: number;
  source: string;
  sourceLine: number;
  sourceColumn: number;
}

export interface SourceMapV3 {
  version: 3;
  file?: string;
  sources: string[];
  names: string[];
  mappings: string;
}

/** Encodes mappings as a Source Map v3 object. */
export function encodeSourceMap(mappings: Mapping[], file?: string): SourceMapV3 {
  const sources = [...new Set(mappings.map((mapping) => mapping.source))].sort();
  const sourceIndex = new Map(sources.map((source, index) => [source, index]));
  const sorted = [...mappings].sort(
    (a, b) => a.generatedLine - b.generatedLine || a.generatedColumn - b.generatedColumn,
  );

  const lines: string[] = [];
  let line = 0;
  let segments: string[] = [];
  let previousColumn = 0;
  let previousSource = 0;
  let previousSourceLine = 0;
  let previousSourceColumn = 0;

  for (const mapping of sorted) {
    while (line < mapping.generatedLine) {
      lines.push(segments.join(","));
      segments = [];
      previousColumn = 0;
      line++;
    }
    const source = sourceIndex.get(mapping.source)!;
    segments.push(
      encodeVlq(mapping.generatedColumn - previousColumn) +
        encodeVlq(source - previousSource) +
        encodeVlq(mapping.sourceLine - previousSourceLine) +
        encodeVlq(mapping.sourceColumn - previousSourceColumn),
    );
    previousColumn = mapping.generatedColumn;
    previousSource = source;
    previousSourceLine = mapping.sourceLine;
    previousSourceColumn = mapping.sourceColumn;
  }
  lines.push(segments.join(","));

  return {
    version: 3,
    ...(file ? { file } : {}),
    sources,
    names: [],
    mappings: lines.join(";"),
  };
}
