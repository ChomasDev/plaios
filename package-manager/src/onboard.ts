import { createInterface } from "node:readline/promises";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { stdin, stdout } from "node:process";
import { Writable } from "node:stream";
import {
  DEFAULT_REGISTRY,
  writeDynamicAppConfig,
  type DynamicAppConfig,
  type DynamicComponentConfig,
} from "@plaios/app-dynamic";

interface Secret {
  env: string;
  question: string;
  secret?: boolean;
  optional?: boolean;
}

export interface Feature {
  label: string;
  components: readonly DynamicComponentConfig[];
  secrets?: readonly Secret[];
}

const component = (
  name: string,
  iface: string,
  instanceId: string,
  config: Record<string, unknown> = {},
): DynamicComponentConfig => ({
  package: `@plaios/${name}`,
  version: "latest",
  interface: iface,
  instanceId,
  config,
});

/** Always installed: environment, database, discovery, memory, agent loop and router. */
const BASE: readonly DynamicComponentConfig[] = [
  component("env-node", "env-node.process", "env:env-node"),
  component("env-node", "env-node.dotenv", "env:env-node:2", { filePath: ".env", required: false }),
  component("env-node", "env-node.composite", "env:env-node:3"),
  component("sqlite", "sqlite.database", "database:main", { databasePath: ".agent-os/data/agent-os.sqlite" }),
  component("discovery-memory", "discovery-memory.discovery", "discovery:discovery-memory"),
  component("memory-graph", "memory-graph.memory", "memory:memory-graph"),
  component("agent-loop", "agent-loop.agent", "agent:agent-loop"),
  component("orchestrator-default", "orchestrator-default.orchestrator", "orchestrator:orchestrator-default"),
];

const codex = component("codex", "codex.ai", "ai:codex");

export const AI_CHOICES: readonly Feature[] = [
  { label: "Codex, signed in with `codex login` (ChatGPT account)", components: [codex] },
  {
    label: "Codex, with an OpenAI API key",
    components: [codex],
    secrets: [{ env: "CODEX_API_KEY", question: "OpenAI API key", secret: true }],
  },
];

export const CHANNELS: readonly Feature[] = [
  {
    label: "Telegram bot",
    components: [
      component("telegram", "telegram.input", "input:telegram"),
      component("telegram", "telegram.output", "output:telegram"),
    ],
    secrets: [
      { env: "TELEGRAM_BOT_TOKEN", question: "Telegram bot token (from @BotFather)", secret: true },
      { env: "TELEGRAM_CHAT_ID", question: "Your Telegram chat id" },
    ],
  },
  {
    label: "OpenAI-compatible HTTP API (use it from any OpenAI client)",
    components: [
      component("openrouter-api", "openrouter-api.input", "input:openrouter-api"),
      component("openrouter-api", "openrouter-api.output", "output:openrouter-api"),
    ],
    secrets: [{ env: "OPENROUTER_API_KEY", question: "Key clients must send (empty = no auth)", secret: true, optional: true }],
  },
  {
    label: "Live voice (OpenAI Realtime)",
    components: [component("voice-live", "voice-live.input", "input:voice-live")],
    secrets: [{ env: "OPENAI_API_KEY", question: "OpenAI API key", secret: true }],
  },
];

export const TOOLS: readonly Feature[] = [
  {
    label: "Web search (Perplexity)",
    components: [component("action-perplexity-search", "perplexity-search.action", "action:perplexity-search")],
    secrets: [{ env: "PERPLEXITY_API_KEY", question: "Perplexity API key", secret: true }],
  },
  {
    label: "Home Assistant",
    components: [component("action-home-assistant", "home-assistant.action", "action:home-assistant")],
    secrets: [
      { env: "HOME_ASSISTANT_URL", question: "Home Assistant URL (e.g. http://homeassistant.local:8123)" },
      { env: "HOME_ASSISTANT_TOKEN", question: "Home Assistant long-lived token", secret: true },
    ],
  },
  { label: "Scheduled prompts (cron)", components: [component("cronjob", "cronjob.input", "input:cronjob")] },
  {
    label: "Memory search tool",
    components: [component("action-memory-retrieval", "memory-retrieval.action", "action:memory-retrieval")],
  },
  { label: "Developer guide (ask the agent how to build plugins)", components: [component("developer-guide", "developer-guide.action", "action:developer-guide")] },
];

export function buildOnboardingConfig(registry: string, features: readonly Feature[]): DynamicAppConfig {
  return {
    schemaVersion: 1,
    registry,
    server: { host: "0.0.0.0", port: 3100 },
    components: [...BASE, ...features.flatMap((feature) => feature.components)],
  };
}

/** Sets keys in a .env source, replacing existing lines and appending new ones. */
export function mergeEnv(source: string, values: Readonly<Record<string, string>>): string {
  const pending = new Map(Object.entries(values));
  const lines = source.split(/\r?\n/).map((line) => {
    const separator = line.indexOf("=");
    const key = separator > 0 ? line.slice(0, separator).trim() : "";
    if (!pending.has(key)) return line;
    const value = pending.get(key)!;
    pending.delete(key);
    return `${key}=${quoteEnv(value)}`;
  });
  while (lines.length > 0 && lines.at(-1) === "") lines.pop();
  for (const [key, value] of pending) lines.push(`${key}=${quoteEnv(value)}`);
  return `${lines.join("\n")}\n`;
}

// Same rule as env-node's writer, so its parser reads the value back unchanged.
function quoteEnv(value: string): string {
  return /^[A-Za-z0-9_./:@+-]*$/.test(value) ? value : JSON.stringify(value);
}

/** Parses "1,3" into picked items; throws on numbers outside the list. */
export function pickMany<T>(answer: string, items: readonly T[]): T[] {
  const picked = new Set<T>();
  for (const token of answer.split(/[\s,]+/).filter(Boolean)) {
    const item = items[Number(token) - 1];
    if (!/^\d+$/.test(token) || item === undefined) throw new Error(`"${token}" is not one of 1-${items.length}`);
    picked.add(item);
  }
  return [...picked];
}

/** Interactive first-run setup. Returns false when the user cancels. */
export async function runOnboarding(configPath: string): Promise<boolean> {
  let muted = false;
  const output = new Writable({
    write(chunk, encoding, callback) {
      if (!muted) stdout.write(chunk, encoding);
      callback();
    },
  });
  const readline = createInterface({ input: stdin, output, terminal: true });
  const ask = async (question: string, fallback = "") =>
    (await readline.question(fallback ? `${question} [${fallback}]: ` : `${question}: `)).trim() || fallback;
  const askSecret = async (question: string) => {
    stdout.write(`${question}: `);
    muted = true;
    try {
      return (await readline.question("")).trim();
    } finally {
      muted = false;
      stdout.write("\n");
    }
  };
  const choose = async (title: string, items: readonly Feature[], many: boolean): Promise<Feature[]> => {
    console.log(`\n${title}`);
    items.forEach((item, index) => console.log(`  ${index + 1}. ${item.label}`));
    for (;;) {
      const answer = await ask(many ? "Numbers, comma-separated (empty for none)" : "Choose", many ? "" : "1");
      try {
        const picked = pickMany(answer, items);
        if (many || picked.length === 1) return picked;
        console.log("Pick exactly one.");
      } catch (error) {
        console.log((error as Error).message);
      }
    }
  };

  try {
    console.log("\nWelcome to PLAIOS. Let's set up your agent.\n(The web chat at http://localhost:3100 is always included.)");
    if (existsSync(configPath)) {
      const overwrite = await ask(`\n${configPath} already exists. Replace it? [y/N]`);
      if (!/^y(es)?$/i.test(overwrite)) return false;
    }

    const ai = await choose("Which AI should power the agent?", AI_CHOICES, false);
    const channels = await choose("Where else do you want to talk to it?", CHANNELS, true);
    const tools = await choose("Which tools should it have?", TOOLS, true);
    const features = [...ai, ...channels, ...tools];

    const env: Record<string, string> = {};
    const model = await ask("\nModel", "gpt-5.6-sol");
    env.CODEX_MODEL = model;
    const answers = new Map<string, string>();
    for (const secret of features.flatMap((feature) => feature.secrets ?? [])) {
      if (secret.env in env) continue;
      for (;;) {
        // Same question (e.g. the OpenAI key for Codex and for voice) is asked once.
        const value = answers.get(secret.question)
          ?? (secret.secret ? await askSecret(secret.question) : await ask(secret.question));
        if (value) answers.set(secret.question, value);
        if (value || secret.optional) {
          if (value) env[secret.env] = value;
          break;
        }
        console.log("This one is required.");
      }
    }
    const registry = await ask("\nPackage registry", process.env.AGENT_OS_REGISTRY ?? DEFAULT_REGISTRY);

    await writeDynamicAppConfig(configPath, buildOnboardingConfig(registry, features));
    const envPath = join(dirname(configPath), ".env");
    const current = existsSync(envPath) ? await readFile(envPath, "utf8") : "";
    await writeFile(envPath, mergeEnv(current, env), { encoding: "utf8", mode: 0o600 });

    console.log(`\nSaved ${configPath} and ${envPath}. Change anything later from the control plane or with \`plaios init\`.\n`);
    return true;
  } finally {
    readline.close();
  }
}
