#!/usr/bin/env node

import { createInterface } from "node:readline/promises";
import { realpathSync } from "node:fs";
import { stdin, stdout } from "node:process";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createPlugin } from "./create-plugin.js";
import {
  getPluginKindConfig,
  isPluginKind,
  PLUGIN_KINDS,
  type PluginKind,
} from "./plugin-kinds.js";
import { toKebabCase } from "./naming.js";
import { assertWorkspaceRoot, findWorkspaceRoot } from "./workspace.js";

interface CreateArguments {
  kinds: string[];
  name?: string;
  root?: string;
  yes: boolean;
  help: boolean;
}

function printMainHelp(): void {
  console.log(`Agent OS package manager

Usage:
  agentos create [kinds] [name] [options]

Commands:
  create    Scaffold a new plugin package

Run \`agentos create --help\` for create options.
Publishing will be added when the registry backend is available.`);
}

function printCreateHelp(): void {
  console.log(`Create an Agent OS plugin package.

Usage:
  agentos create
  agentos create action browser
  agentos create input,output telegram
  agentos create --kind ai --kind memory --name assistant --yes

Options:
  -k, --kind <kind>   Interface kind; repeat or use commas
  -n, --name <name>   Plugin implementation name
      --root <path>   Agent OS workspace root
  -y, --yes           Skip confirmation
  -h, --help          Show this help

Kinds:
${PLUGIN_KINDS.map((kind) => {
  const config = getPluginKindConfig(kind);
  return `  ${kind.padEnd(13)} ${config.label} — ${config.description}`;
}).join("\n")}`);
}

function readOptionValue(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("-")) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

export function parseCreateArguments(argv: readonly string[]): CreateArguments {
  const parsed: CreateArguments = { kinds: [], yes: false, help: false };
  const positionals: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]!;

    if (argument === "--kind" || argument === "-k") {
      parsed.kinds.push(readOptionValue(argv, index, argument));
      index += 1;
    } else if (argument === "--name" || argument === "-n") {
      parsed.name = readOptionValue(argv, index, argument);
      index += 1;
    } else if (argument === "--root") {
      parsed.root = readOptionValue(argv, index, argument);
      index += 1;
    } else if (argument === "--yes" || argument === "-y") {
      parsed.yes = true;
    } else if (argument === "--help" || argument === "-h") {
      parsed.help = true;
    } else if (argument.startsWith("-")) {
      throw new Error(`Unknown option: ${argument}`);
    } else {
      positionals.push(argument);
    }
  }

  if (positionals.length > 2) {
    throw new Error(`Unexpected argument: ${positionals[2]}`);
  }

  if (parsed.kinds.length === 0 && positionals[0]) {
    parsed.kinds.push(positionals[0]);
  }
  parsed.name ??= positionals[1];
  return parsed;
}

export function parsePluginKinds(values: readonly string[]): PluginKind[] {
  const tokens = values
    .flatMap((value) => value.split(","))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const kinds: PluginKind[] = [];

  for (const token of tokens) {
    const numericIndex = Number.parseInt(token, 10) - 1;
    const kind =
      String(numericIndex + 1) === token
        ? PLUGIN_KINDS[numericIndex]
        : isPluginKind(token)
          ? token
          : undefined;

    if (!kind) {
      throw new Error(
        `Unknown plugin kind \"${token}\". Expected one of: ${PLUGIN_KINDS.join(", ")}`,
      );
    }

    if (!kinds.includes(kind)) {
      kinds.push(kind);
    }
  }

  if (kinds.length === 0) {
    throw new Error("At least one plugin interface kind is required");
  }

  return kinds;
}

async function askForKinds(
  readline: ReturnType<typeof createInterface>,
): Promise<PluginKind[]> {
  console.log("\nChoose one or more interfaces for this plugin:\n");
  for (const [index, kind] of PLUGIN_KINDS.entries()) {
    const config = getPluginKindConfig(kind);
    console.log(`  ${index + 1}. ${kind.padEnd(13)} ${config.label}`);
  }

  const answer = (
    await readline.question("\nKinds, comma-separated [action]: ")
  ).trim();
  if (!answer) {
    return ["action"];
  }

  return parsePluginKinds([answer]);
}

async function runCreate(argv: readonly string[], currentDirectory: string): Promise<void> {
  const args = parseCreateArguments(argv);
  if (args.help) {
    printCreateHelp();
    return;
  }

  if ((args.kinds.length === 0 || !args.name) && (!stdin.isTTY || !stdout.isTTY)) {
    throw new Error(
      "Interactive creation needs a terminal. Pass at least one --kind and --name.",
    );
  }

  const readline = createInterface({ input: stdin, output: stdout });
  try {
    const kinds =
      args.kinds.length > 0
        ? parsePluginKinds(args.kinds)
        : await askForKinds(readline);

    const name =
      args.name?.trim() ||
      (await readline.question("Plugin implementation name [example]: ")).trim() ||
      "example";
    const normalizedName = toKebabCase(name);
    if (!normalizedName) {
      throw new Error("Plugin name is required");
    }

    const workspaceRoot = args.root
      ? assertWorkspaceRoot(resolve(currentDirectory, args.root))
      : findWorkspaceRoot(currentDirectory);
    const pluginPath = `packages/${normalizedName}`;
    const renderedInterfaces = kinds
      .map(
        (kind) => `    - ${kind} (${getPluginKindConfig(kind).label})`,
      )
      .join("\n");

    console.log(`\nAbout to create:
  interfaces:
${renderedInterfaces}
  workspace: ${workspaceRoot}
  path:      ${pluginPath}
`);

    if (!args.yes) {
      const confirmation = (
        await readline.question("Create this plugin? [y/N]: ")
      )
        .trim()
        .toLowerCase();

      if (confirmation !== "y" && confirmation !== "yes") {
        console.log("Cancelled.");
        return;
      }
    }

    const created = await createPlugin({ workspaceRoot, kinds, name });
    const createdPath = relative(workspaceRoot, created.packageDirectory);
    const exports = created.interfaces
      .map((item) => `    - ${item.className} (${item.kind})`)
      .join("\n");

    console.log(`\nCreated ${createdPath}
  package: ${created.packageName}
  exports:
${exports}

Next:
  1. Run pnpm install
  2. Implement the runtime TODOs in ${createdPath}/src/*.ts
  3. Customize each interface screen in ${createdPath}/web/*/index.tsx
  4. Run pnpm --filter ${created.packageName} typecheck`);
  } finally {
    readline.close();
  }
}

export async function main(
  argv: readonly string[] = process.argv.slice(2),
  currentDirectory = process.cwd(),
): Promise<void> {
  const [command, ...commandArguments] = argv;

  if (!command || command === "--help" || command === "-h") {
    printMainHelp();
    return;
  }

  if (command === "create") {
    await runCreate(commandArguments, currentDirectory);
    return;
  }

  if (command === "publish") {
    throw new Error(
      "The publish command is not available yet; it requires the registry backend.",
    );
  }

  throw new Error(`Unknown command: ${command}`);
}

const isEntrypoint =
  process.argv[1] &&
  realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntrypoint) {
  main().catch((error: unknown) => {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
