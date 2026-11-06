import {
  Compiler,
  encodeSourceMap,
  minifyCss,
  type CompileInput,
  type CompileOptions,
  type CompileResult,
  type Mapping,
} from "@croff/compiler";
import {
  definePlugin,
  PLUGIN_API_VERSION,
  PluginError,
  pluginThemes,
  registerPlugins,
  validatePlugin,
  type CroffPlugin,
} from "@croff/plugin-api";
import { createRegistry, reservedTokenIssues, type Registry } from "@croff/registry";
import { createTheme, type ResolvedTheme, type ThemeConfig, type ThemeIssue } from "@croff/theme";
import {
  directiveLayers,
  findDirectives,
  unknownDirective,
  type DirectiveError,
} from "./directive.js";

/** The contents of `croff.config.ts`. */
export interface CroffConfig {
  /** Glob patterns of files to scan, relative to the project root. */
  content?: string[];
  /** Extra glob patterns to exclude from scanning. */
  ignore?: string[];
  /** Function names whose arguments are class names. Used to improve diagnostics. */
  classFunctions?: string[];
  /** Token overrides. Merged over the preset and plugins. `null` removes a token. */
  theme?: ThemeConfig;
  /** `"default"` starts from the default theme; `"none"` starts empty. */
  preset?: "default" | "none";
  /** Plugins, applied in order. */
  plugins?: CroffPlugin[];
  /** Which theme variables to emit. Defaults to `"used"`. */
  variables?: "used" | "all" | "none";
  /** Used by `croff build` and `croff dev`: a stylesheet containing `@croff`. */
  input?: string;
  /** Used by `croff build` and `croff dev`: where to write the CSS. */
  output?: string;
}

/** Identity function that gives configuration files types. */
export function defineConfig(config: CroffConfig): CroffConfig {
  return config;
}

export class CroffConfigError extends Error {
  override name = "CroffConfigError";

  constructor(readonly issues: readonly ThemeIssue[]) {
    super(`Invalid CROFF theme:\n${issues.map((issue) => `  - ${issue.message}`).join("\n")}`);
  }
}

export interface Croff {
  theme: ResolvedTheme;
  registry: Registry;
  compile(inputs: Iterable<CompileInput>, options?: CompileOptions): CompileResult;
  /** Replaces `@croff` directives in a stylesheet with generated CSS. */
  processCss(
    css: string,
    inputs: Iterable<CompileInput>,
    options?: ProcessCssOptions,
  ): ProcessCssResult;
}

export interface ProcessCssOptions {
  minify?: boolean;
  /** Generate a source map relating generated rules to where each expression was first used. */
  sourceMap?: boolean;
  /** The output file name recorded in the source map. */
  file?: string;
}

export interface ProcessCssResult extends CompileResult {
  /** The directives that had problems. */
  directiveErrors: DirectiveError[];
  /** Whether the stylesheet contained a directive at all. */
  hasDirective: boolean;
}

export interface CreateCroffOptions {
  /** Throw on invalid theme tokens. Defaults to true. `false` reports them in `issues`. */
  strict?: boolean;
}

/**
 * Creates the engine: theme, registry and compiler. Browser-safe. This is what
 * the documentation playground runs.
 */
export function createCroff(
  config: CroffConfig = {},
  options: CreateCroffOptions = {},
): Croff & { issues: ThemeIssue[] } {
  const plugins = config.plugins ?? [];
  plugins.forEach((plugin) => validatePlugin(plugin));

  const { theme, issues } = createTheme([...pluginThemes(plugins), config.theme], {
    preset: config.preset ?? "default",
  });
  for (const issue of reservedTokenIssues(theme)) {
    delete theme.scales[issue.scale]![issue.token!];
    issues.push(issue);
  }
  if (issues.length > 0 && options.strict !== false) throw new CroffConfigError(issues);

  const registry = createRegistry(theme);
  registerPlugins(registry, plugins);

  const compiler = new Compiler({ theme, registry });
  const defaults = config.variables ? { variables: config.variables } : {};

  return {
    theme,
    registry,
    issues,
    compile: (inputs, compileOptions) =>
      compiler.compile(inputs, { ...defaults, ...compileOptions }),
    processCss(css, inputs, processOptions = {}) {
      const list = [...inputs];
      const minify = processOptions.minify ?? false;
      const sourceMap = processOptions.sourceMap ?? false;
      const baseline = compiler.compile(list, { ...defaults, layers: [] });
      const directives = findDirectives(css);
      const directiveErrors: DirectiveError[] = [];
      const mappings: Mapping[] = [];

      let out = "";
      let line = 0;
      let column = 0;
      const append = (text: string) => {
        out += text;
        const lastNewline = text.lastIndexOf("\n");
        if (lastNewline === -1) {
          column += text.length;
        } else {
          line += text.split("\n").length - 1;
          column = text.length - lastNewline - 1;
        }
      };
      // Hand-written text is minified piece by piece, so that positions in the output are known.
      const handWritten = (text: string) => append(minify ? minifyCss(text) : text);

      let cursor = 0;
      for (const directive of directives) {
        handWritten(css.slice(cursor, directive.start));
        cursor = directive.end;
        const layers = directiveLayers(directive.params);
        if (!layers) {
          directiveErrors.push(unknownDirective(directive.params));
          continue;
        }
        const generated = compiler.compile(list, { ...defaults, minify, layers, sourceMap });
        for (const mapping of generated.mappings ?? []) {
          mappings.push({
            ...mapping,
            generatedLine: mapping.generatedLine + line,
            generatedColumn: mapping.generatedColumn + (mapping.generatedLine === 0 ? column : 0),
          });
        }
        append(generated.css.trimEnd());
      }
      handWritten(css.slice(cursor));

      return {
        ...baseline,
        css: out,
        directiveErrors,
        hasDirective: directives.length > 0,
        ...(sourceMap ? { map: encodeSourceMap(mappings, processOptions.file), mappings } : {}),
      };
    },
  };
}

export { findDirectives, type Directive, type DirectiveError } from "./directive.js";
export { definePlugin, PLUGIN_API_VERSION, PluginError, type CroffPlugin };
export { formatParseError, parse, type ParseError, type UtilityNode } from "@croff/parser";
export type {
  CompiledRule,
  CompileFailure,
  CompileInput,
  CompileOptions,
  CompileResult,
  CssLayer,
  SourceLocation,
  SourceMapV3,
} from "@croff/compiler";
export { builtinUtilities, stateVariants, utilityCategories, values } from "@croff/registry";
export type {
  ArgumentSpec,
  Declarations,
  UtilityDefinition,
  UtilityInput,
  ValueType,
  VariantDefinition,
} from "@croff/registry";
export { defaultTheme } from "@croff/theme";
export type { ResolvedTheme, ThemeConfig, ThemeIssue, TokenGroup } from "@croff/theme";
