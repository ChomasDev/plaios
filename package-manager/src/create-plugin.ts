import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

import { getPluginKindConfig, type PluginKind } from "./plugin-kinds.js";
import { toKebabCase, toPascalCase, toSnakeCase } from "./naming.js";
import {
  renderManifest,
  renderIndex,
  renderPackageJson,
  renderSource,
  renderTsConfig,
  renderWeb,
  renderWebStyles,
  type TemplateValues,
} from "./templates.js";

export interface CreatePluginOptions {
  readonly workspaceRoot: string;
  readonly kinds: readonly PluginKind[];
  readonly name: string;
}

export interface CreatedPluginInterface {
  readonly kind: PluginKind;
  readonly className: string;
}

export interface CreatedPlugin {
  readonly packageName: string;
  readonly packageDirectory: string;
  readonly interfaces: readonly CreatedPluginInterface[];
}

export async function createPlugin(
  options: CreatePluginOptions,
): Promise<CreatedPlugin> {
  const workspaceRoot = resolve(options.workspaceRoot);
  const name = toKebabCase(options.name);

  if (!name) {
    throw new Error("Plugin name is required");
  }

  const kinds = [...new Set(options.kinds)];
  if (kinds.length === 0) {
    throw new Error("At least one plugin interface kind is required");
  }

  const pascalName = toPascalCase(name);
  const packageName = `@plaios/${name}`;
  const packagesDirectory = join(workspaceRoot, "packages");
  const packageDirectory = join(packagesDirectory, name);

  if (existsSync(packageDirectory)) {
    throw new Error(
      `Plugin already exists: ${relative(workspaceRoot, packageDirectory)}`,
    );
  }

  const interfaces: TemplateValues[] = kinds.map((kind) => ({
    kind,
    name,
    pascalName,
    snakeName: toSnakeCase(name),
    className: `${pascalName}${getPluginKindConfig(kind).classSuffix}`,
    packageName,
  }));

  const plugin = interfaces[0]!;

  const files = new Map<string, string>([
    ["agent-os.package.yaml", renderManifest(interfaces)],
    ["package.json", renderPackageJson(plugin)],
    ["tsconfig.json", renderTsConfig()],
    [join("src", "index.ts"), renderIndex(kinds)],
    [join("web", "styles.css"), renderWebStyles()],
    ...interfaces.map(
      (item) => [join("src", `${item.kind}.ts`), renderSource(item)] as const,
    ),
    ...interfaces.map(
      (item) =>
        [join("web", item.kind, "index.tsx"), renderWeb(item)] as const,
    ),
  ]);

  await mkdir(packagesDirectory, { recursive: true });
  const temporaryDirectory = await mkdtemp(
    join(packagesDirectory, ".agentos-"),
  );

  try {
    await Promise.all(
      [...files].map(async ([path, contents]) => {
        const destination = join(temporaryDirectory, path);
        await mkdir(dirname(destination), { recursive: true });
        await writeFile(destination, contents, "utf8");
      }),
    );
    await rename(temporaryDirectory, packageDirectory);
  } catch (error) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }

  return {
    packageName,
    packageDirectory,
    interfaces: interfaces.map(({ kind, className }) => ({ kind, className })),
  };
}
