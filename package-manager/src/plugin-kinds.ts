export const PLUGIN_KINDS = [
  "input",
  "output",
  "action",
  "agent",
  "orchestrator",
  "discovery",
  "database",
  "memory",
  "system1",
  "system2",
  "env",
] as const;

export type PluginKind = (typeof PLUGIN_KINDS)[number];

export interface PluginKindConfig {
  readonly label: string;
  readonly classSuffix: string;
  readonly description: string;
}

const CONFIG: Record<PluginKind, PluginKindConfig> = {
  input: {
    label: "InputInterface",
    classSuffix: "Input",
    description: "Receive messages from a channel or event source",
  },
  output: {
    label: "OutputInterface",
    classSuffix: "Output",
    description: "Deliver responses to a channel or destination",
  },
  action: {
    label: "Capability",
    classSuffix: "Capability",
    description: "Expose an executable tool to the agent",
  },
  agent: {
    label: "AgentLoop",
    classSuffix: "AgentLoop",
    description: "Run the model and capability execution loop",
  },
  orchestrator: {
    label: "Orchestrator",
    classSuffix: "Orchestrator",
    description: "Route inputs to capabilities and outputs",
  },
  discovery: {
    label: "CapabilityDiscovery",
    classSuffix: "Discovery",
    description: "Register and discover capabilities",
  },
  database: {
    label: "DatabaseProvider",
    classSuffix: "DatabaseProvider",
    description: "Provide capability-scoped database access",
  },
  memory: {
    label: "Memory",
    classSuffix: "Memory",
    description: "Store and recall agent memories",
  },
  system1: {
    label: "System1",
    classSuffix: "System1",
    description: "Answer fast typed judgments (for example TypeSafe Jev)",
  },
  system2: {
    label: "System2",
    classSuffix: "System2",
    description: "Connect PLAIOS to a generative model provider",
  },
  env: {
    label: "Environment",
    classSuffix: "Environment",
    description: "Provide configuration and secrets",
  },
};

export function isPluginKind(value: string): value is PluginKind {
  return PLUGIN_KINDS.includes(value as PluginKind);
}

export function getPluginKindConfig(kind: PluginKind): PluginKindConfig {
  return CONFIG[kind];
}
