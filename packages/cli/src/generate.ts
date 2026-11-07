import { readFile } from "node:fs/promises";
import { basename, dirname, relative } from "node:path";
import type { SourceMapV3 } from "@croffcss/core";
import type { Diagnostic, Project } from "@croffcss/core/node";

export interface GenerateOptions {
  input: string | undefined;
  output: string | undefined;
  minify: boolean;
  sourceMap: boolean;
}

export interface Generated {
  css: string;
  map?: SourceMapV3;
  diagnostics: Diagnostic[];
  rules: number;
}

/** Generates a project's stylesheet, from the input file if there is one. */
export async function generate(project: Project, options: GenerateOptions): Promise<Generated> {
  const { input, output, minify, sourceMap } = options;
  const file = output ? { file: basename(output) } : {};
  const rebased = (map: SourceMapV3 | undefined) =>
    map && output ? rebaseSources(map, project.cwd, output) : map;

  if (input !== undefined) {
    let source: string;
    try {
      source = await readFile(input, "utf8");
    } catch {
      throw new Error(`Input stylesheet not found: ${input}`);
    }
    const result = await project.processCss(source, { minify, sourceMap, ...file });
    const diagnostics: Diagnostic[] = [...result.diagnostics];
    for (const error of result.directiveErrors) {
      diagnostics.push({ severity: "error", code: "invalid-directive", message: error.message });
    }
    if (!result.hasDirective) {
      diagnostics.push({
        severity: "warning",
        code: "no-directive",
        message: `${input} has no @croff directive, so no CSS is generated into it. Add "@croff;" where the output should go.`,
      });
    }
    const map = rebased(result.map);
    return { css: result.css, ...(map ? { map } : {}), diagnostics, rules: result.rules.length };
  }

  const result = await project.generate({ minify, sourceMap, ...file });
  const map = rebased(result.map);
  return {
    css: result.css,
    ...(map ? { map } : {}),
    diagnostics: result.diagnostics,
    rules: result.rules.length,
  };
}

/** Source map paths are relative to the map file, not to the project root. */
function rebaseSources(map: SourceMapV3, root: string, output: string): SourceMapV3 {
  const fromOutput = relative(dirname(output), root).replaceAll("\\", "/");
  return {
    ...map,
    sources: map.sources.map((source) => (fromOutput ? `${fromOutput}/${source}` : source)),
  };
}
