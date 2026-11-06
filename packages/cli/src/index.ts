import { parseArgs, type ParseArgsConfig } from "node:util";
import { buildCommand } from "./commands/build.js";
import { checkCommand } from "./commands/check.js";
import { devCommand } from "./commands/dev.js";
import { initCommand } from "./commands/init.js";
import { paint, UsageError, type Command, type Output } from "./shared.js";

export const VERSION = "0.1.0";

export const COMMANDS: Record<string, Command> = {
  init: initCommand,
  dev: devCommand,
  build: buildCommand,
  check: checkCommand,
};

function mainHelp(): string {
  const lines = [
    `${paint.bold("croff")} ${VERSION}: an expressive utility-first CSS framework`,
    "",
    paint.bold("Usage"),
    "  croff <command> [options]",
    "",
    paint.bold("Commands"),
  ];
  for (const [name, command] of Object.entries(COMMANDS)) {
    lines.push(`  ${name.padEnd(8)}${command.summary}`);
  }
  lines.push(
    "",
    paint.bold("Options"),
    "  -h, --help     Show help for croff or a command",
    "  -v, --version  Show the version",
    "",
    "Run croff <command> --help for a command's options.",
  );
  return lines.join("\n");
}

function commandHelp(name: string, command: Command): string {
  const lines = [
    command.summary,
    "",
    paint.bold("Usage"),
    `  croff ${name} ${command.usage}`.trimEnd(),
  ];
  if (command.description) lines.push("", command.description);
  lines.push("", paint.bold("Options"));
  for (const option of command.options) {
    const short = option.short ? `-${option.short}, ` : "    ";
    const value = option.type === "string" ? ` <${option.value ?? "value"}>` : "";
    lines.push(`  ${`${short}--${option.name}${value}`.padEnd(30)}${option.description}`);
  }
  lines.push(`  ${"-h, --help".padEnd(30)}Show this help`);
  return lines.join("\n");
}

const defaultOutput: Output = {
  log: (message) => console.log(message),
  error: (message) => console.error(message),
};

/** Runs the CLI and returns an exit code. */
export async function run(argv: string[], output: Output = defaultOutput): Promise<number> {
  const [first, ...rest] = argv;

  if (first === undefined || first === "-h" || first === "--help" || first === "help") {
    output.log(mainHelp());
    return 0;
  }
  if (first === "-v" || first === "--version") {
    output.log(VERSION);
    return 0;
  }

  const command = Object.hasOwn(COMMANDS, first) ? COMMANDS[first] : undefined;
  if (!command) {
    output.error(`Unknown command "${first}".\n\n${mainHelp()}`);
    return 1;
  }

  const options: NonNullable<ParseArgsConfig["options"]> = {
    help: { type: "boolean", short: "h" },
  };
  for (const option of command.options) {
    options[option.name] = {
      type: option.type,
      ...(option.short ? { short: option.short } : {}),
    };
  }

  try {
    const { values } = parseArgs({
      args: rest,
      options,
      allowPositionals: false,
      strict: true,
    });
    if (values["help"]) {
      output.log(commandHelp(first, command));
      return 0;
    }
    return await command.run(values as Record<string, string | boolean | undefined>, output);
  } catch (error) {
    if (
      error instanceof UsageError ||
      (error as { code?: string }).code?.startsWith("ERR_PARSE_ARGS")
    ) {
      output.error(`${(error as Error).message}\n\n${commandHelp(first, command)}`);
      return 1;
    }
    output.error(paint.red(error instanceof Error ? error.message : String(error)));
    return 1;
  }
}

export type { Output } from "./shared.js";
