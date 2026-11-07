import type { Registry, UtilityDefinition, VariantDefinition } from "@croffcss/registry";
import type { ThemeConfig } from "@croffcss/theme";

/**
 * The plugin API version implemented by this release of CROFF.
 *
 * @unstable The plugin API may change between 0.x releases. Plugins state the version they target with `apiVersion`, and
 * CROFF refuses to load a plugin targeting a different one.
 */
export const PLUGIN_API_VERSION = 1;

/** A utility without its name, which comes from its key in `utilities`. */
export type PluginUtility = Omit<UtilityDefinition, "name" | "category" | "examples" | "plugin"> &
  Partial<Pick<UtilityDefinition, "category" | "examples">>;

/** A variant without its name, which comes from its key in `variants`. */
export type PluginVariant = Omit<VariantDefinition, "name" | "breakpoint">;

/** @unstable The plugin API may change between 0.x releases. */
export interface CroffPlugin {
  /** A unique name. By convention `croff-plugin-*`, or `@scope/croff-plugin-*`. */
  name: string;
  /** The plugin API version this plugin targets. Defaults to the current version. */
  apiVersion?: number;
  /** Merged over the default theme, before the user's configuration. */
  theme?: ThemeConfig;
  /** New utilities. They sort after the built-ins in the cascade. */
  utilities?: Record<string, PluginUtility>;
  /** New variants. They sort after the built-ins in the cascade. */
  variants?: Record<string, PluginVariant>;
  /** Replace same-named built-ins instead of failing. Off by default. */
  override?: boolean;
}

export class PluginError extends Error {
  override name = "PluginError";

  constructor(
    readonly plugin: string,
    message: string,
  ) {
    super(`Plugin "${plugin}": ${message}`);
  }
}

/**
 * Identity function that gives plugin authors types.
 *
 * @unstable The plugin API may change between 0.x releases.
 */
export function definePlugin(plugin: CroffPlugin): CroffPlugin {
  return plugin;
}

const PLUGIN_NAME = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

/** Checks a plugin's shape. Definitions are validated in depth when they are registered. */
export function validatePlugin(plugin: unknown): asserts plugin is CroffPlugin {
  if (typeof plugin !== "object" || plugin === null) {
    throw new PluginError("(unknown)", "A plugin must be an object created with definePlugin().");
  }
  const { name, apiVersion, theme, utilities, variants } = plugin as Record<string, unknown>;
  if (typeof name !== "string" || !PLUGIN_NAME.test(name)) {
    throw new PluginError(String(name), "A plugin needs a valid package-style name.");
  }
  if (apiVersion !== undefined && apiVersion !== PLUGIN_API_VERSION) {
    throw new PluginError(
      name,
      `It targets plugin API version ${String(apiVersion)}, but this version of CROFF implements version ${PLUGIN_API_VERSION}.`,
    );
  }
  for (const [key, value] of Object.entries({ theme, utilities, variants })) {
    if (value !== undefined && (typeof value !== "object" || value === null)) {
      throw new PluginError(name, `"${key}" must be an object.`);
    }
  }
}

/** The theme layers contributed by plugins, in plugin order. */
export function pluginThemes(plugins: readonly CroffPlugin[]): ThemeConfig[] {
  return plugins.flatMap((plugin) => (plugin.theme ? [plugin.theme] : []));
}

/**
 * Registers each plugin's utilities and variants, in order. Failures name the
 * responsible plugin. Duplicate plugin names are rejected.
 */
export function registerPlugins(registry: Registry, plugins: readonly CroffPlugin[]): void {
  const seen = new Set<string>();
  for (const plugin of plugins) {
    validatePlugin(plugin);
    if (seen.has(plugin.name)) {
      throw new PluginError(plugin.name, "It is registered twice.");
    }
    seen.add(plugin.name);
    const override = plugin.override ?? false;
    try {
      for (const [name, utility] of Object.entries(plugin.utilities ?? {})) {
        registry.addUtility(
          { category: "plugins", examples: [], ...utility, name, plugin: plugin.name },
          { override },
        );
      }
      for (const [name, variant] of Object.entries(plugin.variants ?? {})) {
        registry.addVariant({ ...variant, name }, { override });
      }
    } catch (error) {
      if (error instanceof PluginError) throw error;
      throw new PluginError(plugin.name, error instanceof Error ? error.message : String(error));
    }
  }
}
