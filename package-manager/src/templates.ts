import type { PluginKind } from "./plugin-kinds.js";

export interface TemplateValues {
  readonly kind: PluginKind;
  readonly name: string;
  readonly pascalName: string;
  readonly snakeName: string;
  readonly className: string;
  readonly packageName: string;
  readonly packageId: string;
}

export function renderPackageJson(values: TemplateValues): string {
  return `${JSON.stringify(
    {
      name: values.packageName,
      version: "0.1.0",
      private: true,
      type: "module",
      sideEffects: false,
      files: ["dist", "agent-os.package.yaml"],
      main: "./dist/index.js",
      types: "./dist/index.d.ts",
      exports: {
        ".": {
          types: "./dist/index.d.ts",
          import: "./dist/index.js",
        },
      },
      scripts: {
        build: "tsc -p tsconfig.json",
        typecheck: "tsc --noEmit -p tsconfig.json",
      },
      dependencies: {
        "@agent-os/core": "workspace:*",
      },
    },
    null,
    2,
  )}\n`;
}

export function renderTsConfig(): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        lib: ["ES2022", "DOM"],
        strict: true,
        rootDir: "src",
        outDir: "dist",
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        verbatimModuleSyntax: true,
        isolatedModules: true,
        skipLibCheck: true,
      },
      include: ["src/**/*.ts"],
    },
    null,
    2,
  )}\n`;
}

export function renderManifest(interfaces: readonly TemplateValues[]): string {
  const plugin = interfaces[0];
  if (!plugin) {
    throw new Error("At least one plugin interface is required");
  }

  const renderedInterfaces = interfaces
    .map(
      (item) => `  - id: ${item.packageId}.${item.kind}
    kind: ${item.kind}
    name: ${item.className}
    entry: .
    export: .
    className: ${item.className}
    description: TODO describe this interface
    permissions: []
    required: []`,
    )
    .join("\n");

  return `schemaVersion: 1
id: ${plugin.packageId}
name: ${plugin.pascalName}
version: 0.1.0
description: TODO describe this plugin
interfaces:
${renderedInterfaces}
`;
}

export function renderIndex(kinds: readonly PluginKind[]): string {
  return `${kinds.map((kind) => `export * from "./${kind}.js";`).join("\n")}\n`;
}

export function renderSource(values: TemplateValues): string {
  const renderers: Record<PluginKind, (input: TemplateValues) => string> = {
    input: renderInput,
    output: renderOutput,
    action: renderAction,
    agent: renderAgent,
    orchestrator: renderOrchestrator,
    discovery: renderDiscovery,
    database: renderDatabase,
    memory: renderMemory,
    ai: renderAi,
    env: renderEnvironment,
  };

  return renderers[values.kind](values);
}

function renderInput({ className, name }: TemplateValues): string {
  return `import type {
  InputInterface,
  InputListener,
  InputMessage,
} from "@agent-os/core/domain";

export interface ${className}Options {
  sessionId?: string;
}

export class ${className} implements InputInterface {
  readonly channel = "${name}" as const;
  private listening = false;

  constructor(private readonly options: ${className}Options = {}) {}

  async start(listener: InputListener): Promise<void> {
    if (this.listening) {
      throw new Error("${className} is already running");
    }

    this.listening = true;
    // TODO: connect the input source and call listener(message).
    void listener;
    void this.createMessage;
  }

  async stop(): Promise<void> {
    this.listening = false;
  }

  private createMessage(text: string): InputMessage {
    return {
      id: crypto.randomUUID(),
      channel: this.channel,
      sessionId: this.options.sessionId ?? crypto.randomUUID(),
      text,
      createdAt: new Date(),
    };
  }
}
`;
}

function renderOutput({ className, name }: TemplateValues): string {
  return `import type {
  OutputContent,
  OutputInterface,
} from "@agent-os/core/domain";

export interface ${className}Options {}

export class ${className} implements OutputInterface {
  readonly channel = "${name}" as const;

  constructor(private readonly options: ${className}Options = {}) {
    void this.options;
  }

  async write(content: OutputContent): Promise<void> {
    // TODO: deliver content to the output destination.
    void content;
  }
}
`;
}

function renderAction({ className, name, pascalName, snakeName }: TemplateValues): string {
  return `import type {
  Capability,
  CapabilityExecutionContext,
  CapabilityManifest,
  CapabilityResult,
} from "@agent-os/core/domain";

export interface ${pascalName}ActionInput {
  // TODO: define capability input.
}

export interface ${pascalName}ActionOutput {
  // TODO: define capability output.
}

export interface ${className}Options {}

const manifest: CapabilityManifest = {
  id: "${name}.run",
  version: "1.0.0",
  name: "${snakeName}",
  description: "TODO: describe what this capability does.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  outputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  tags: ["${name}"],
};

export class ${className}
  implements Capability<${pascalName}ActionInput, ${pascalName}ActionOutput>
{
  readonly manifest = manifest;

  constructor(private readonly options: ${className}Options = {}) {
    void this.options;
  }

  async execute(
    input: ${pascalName}ActionInput,
    context: CapabilityExecutionContext,
  ): Promise<CapabilityResult<${pascalName}ActionOutput>> {
    // TODO: implement capability.
    void input;
    void context;

    return {
      success: true,
      data: {} as ${pascalName}ActionOutput,
    };
  }
}
`;
}

function renderAgent({ className }: TemplateValues): string {
  return `import type {
  AgentLoop,
  AgentLoopOptions,
  AIProcessResult,
  InputMessage,
} from "@agent-os/core/domain";

export interface ${className}Options {}

export class ${className} implements AgentLoop {
  constructor(private readonly options: ${className}Options = {}) {
    void this.options;
  }

  async run(
    message: InputMessage,
    options: AgentLoopOptions,
  ): Promise<AIProcessResult> {
    // TODO: implement the agent loop.
    void options;
    return { type: "text", text: message.text };
  }
}
`;
}

function renderOrchestrator({ className }: TemplateValues): string {
  return `import type {
  InputMessage,
  OrchestrationDecision,
  Orchestrator,
  OrchestratorOptions,
  OutputInterface,
} from "@agent-os/core/domain";

export interface ${className}Options {}

export class ${className} implements Orchestrator {
  constructor(private readonly options: ${className}Options = {}) {
    void this.options;
  }

  async orchestrate(
    message: InputMessage,
    outputs: readonly OutputInterface[],
    options: OrchestratorOptions = {},
  ): Promise<OrchestrationDecision> {
    // TODO: choose capabilities and outputs for this message.
    void options;

    const output =
      outputs.find((candidate) => candidate.channel === message.channel) ??
      outputs[0];

    if (!output) {
      throw new Error("${className} requires at least one output");
    }

    return {
      capabilityIds: [],
      outputChannel: output.channel,
      additionalOutputs: [],
    };
  }
}
`;
}

function renderDiscovery({ className }: TemplateValues): string {
  return `import type {
  Capability,
  CapabilityDiscovery,
  CapabilityDiscoveryQuery,
  CapabilityManifest,
} from "@agent-os/core/domain";

export class ${className} implements CapabilityDiscovery {
  private readonly capabilities = new Map<string, Capability[]>();

  async register(capability: Capability): Promise<void> {
    const registered = this.capabilities.get(capability.manifest.id) ?? [];
    registered.push(capability);
    this.capabilities.set(capability.manifest.id, registered);
  }

  async get(id: string, version?: string): Promise<Capability | undefined> {
    const registered = this.capabilities.get(id);
    if (version) {
      return registered?.find((item) => item.manifest.version === version);
    }
    return registered?.at(-1);
  }

  async discover(
    query: CapabilityDiscoveryQuery = {},
  ): Promise<readonly CapabilityManifest[]> {
    // TODO: filter by query text, tags, and limit.
    void query;
    return [...this.capabilities.values()]
      .flat()
      .map((capability) => capability.manifest);
  }
}
`;
}

function renderDatabase({ className }: TemplateValues): string {
  return `import type {
  Database,
  DatabaseProvider,
} from "@agent-os/core/domain";

export interface ${className}Options {}

export class ${className} implements DatabaseProvider {
  constructor(private readonly options: ${className}Options = {}) {
    void this.options;
  }

  scope(namespace: string): Database {
    // TODO: return a database view isolated to this namespace.
    void namespace;
    throw new Error("${className}.scope is not implemented");
  }

  async close(): Promise<void> {
    // TODO: close database resources when applicable.
  }
}
`;
}

function renderMemory({ className }: TemplateValues): string {
  return `import type {
  Memory,
  MemoryEntry,
  MemoryQuery,
} from "@agent-os/core/domain";

export interface ${className}Options {}

export class ${className} implements Memory {
  constructor(private readonly options: ${className}Options = {}) {
    void this.options;
  }

  async remember(entry: MemoryEntry): Promise<void> {
    void entry;
    throw new Error("${className}.remember is not implemented");
  }

  async get(id: string): Promise<MemoryEntry | undefined> {
    void id;
    throw new Error("${className}.get is not implemented");
  }

  async recall(query: MemoryQuery = {}): Promise<readonly MemoryEntry[]> {
    void query;
    throw new Error("${className}.recall is not implemented");
  }

  async forget(id: string): Promise<boolean> {
    void id;
    throw new Error("${className}.forget is not implemented");
  }

  async clear(query: MemoryQuery = {}): Promise<number> {
    void query;
    throw new Error("${className}.clear is not implemented");
  }

  async close(): Promise<void> {
    // TODO: close memory resources when applicable.
  }
}
`;
}

function renderAi({ className, name }: TemplateValues): string {
  return `import type {
  AIExecutableFunctionDefinition,
  AIFunctionCallResult,
  AIFunctionDefinition,
  AIFunctionProcessOptions,
  AIInput,
  AIModelSettings,
  AIProcessOptions,
  AIProcessResult,
  AIProvider,
} from "@agent-os/core/domain";

export interface ${className}Options {
  model: string;
  apiKey?: string;
  settings?: AIModelSettings;
}

export class ${className} implements AIProvider {
  readonly provider = "${name}" as const;
  readonly model: string;
  readonly settings: Readonly<AIModelSettings>;

  constructor(options: ${className}Options) {
    const model = options.model.trim();
    if (!model) {
      throw new Error("${className} model is required");
    }

    this.model = model;
    this.settings = Object.freeze({ ...options.settings });
  }

  async processInput(
    input: AIInput,
    options: AIProcessOptions = {},
  ): Promise<AIProcessResult> {
    // TODO: call the model provider.
    void options;
    return { type: "text", text: typeof input === "string" ? input : input.text };
  }

  async functionCall<TArguments>(
    input: string,
    definition: AIFunctionDefinition<TArguments>,
    options: Omit<AIProcessOptions, "stream"> = {},
  ): Promise<AIFunctionCallResult<TArguments>> {
    void input;
    void definition;
    void options;
    throw new Error("${className}.functionCall is not implemented");
  }

  async processWithFunctions(
    input: AIInput,
    definitions: readonly AIExecutableFunctionDefinition[],
    options: AIFunctionProcessOptions = {},
  ): Promise<AIProcessResult> {
    void definitions;
    void options;
    return { type: "text", text: typeof input === "string" ? input : input.text };
  }
}
`;
}

function renderEnvironment({ className }: TemplateValues): string {
  return `import type { Environment } from "@agent-os/core/domain";

export interface ${className}Options {
  values?: Readonly<Record<string, string | undefined>>;
}

export class ${className} implements Environment {
  constructor(private readonly options: ${className}Options = {}) {}

  get(key: string): string | undefined {
    // TODO: read from the environment provider.
    return this.options.values?.[key] || undefined;
  }

  getRequired(key: string): string {
    const value = this.get(key);
    if (value === undefined) {
      throw new Error(\`Missing required environment variable: \${key}\`);
    }
    return value;
  }

  getOrDefault(key: string, fallback: string): string {
    return this.get(key) ?? fallback;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  getAll(): Record<string, string> {
    return Object.fromEntries(
      Object.entries(this.options.values ?? {}).filter(
        (entry): entry is [string, string] => entry[1] !== undefined,
      ),
    );
  }
}
`;
}
