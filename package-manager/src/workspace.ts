import { existsSync } from "node:fs";
import { dirname, parse, resolve } from "node:path";

function isAgentOsWorkspace(directory: string): boolean {
  return (
    existsSync(resolve(directory, "pnpm-workspace.yaml")) &&
    existsSync(resolve(directory, "core", "package.json"))
  );
}

export function findWorkspaceRoot(startDirectory: string): string {
  let current = resolve(startDirectory);
  const filesystemRoot = parse(current).root;

  while (true) {
    if (isAgentOsWorkspace(current)) {
      return current;
    }

    if (current === filesystemRoot) {
      throw new Error(
        "Could not find an Agent OS workspace. Run this command inside AgentOsv2 or pass --root <path>.",
      );
    }

    current = dirname(current);
  }
}

export function assertWorkspaceRoot(directory: string): string {
  const root = resolve(directory);
  if (!isAgentOsWorkspace(root)) {
    throw new Error(
      `Not an Agent OS workspace: ${root}. Expected pnpm-workspace.yaml and core/package.json.`,
    );
  }
  return root;
}
