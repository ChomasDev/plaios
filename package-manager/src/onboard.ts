import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, openSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { userInfo } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { styleText } from "node:util";
import { cancel, confirm, intro, isCancel, log, note, outro, password, spinner, text } from "@clack/prompts";
import { setTimeout as sleep } from "node:timers/promises";
import {
  DEFAULT_REGISTRY,
  writeDynamicAppConfig,
  type DynamicAppConfig,
  type DynamicComponentConfig,
} from "@plaios/app-dynamic";
import { pickMany, pickOne } from "./picker.js";

interface Secret {
  env: string;
  question: string;
  secret?: boolean;
  optional?: boolean;
  fallback?: string;
}

export interface Feature {
  label: string;
  hint?: string;
  icon?: string;
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

/** Always installed: discovery, memory, agent loop and router. Environment and database are picked in the setup. */
const BASE: readonly DynamicComponentConfig[] = [
  component("discovery-memory", "discovery-memory.discovery", "discovery:discovery-memory"),
  component("memory-graph", "memory-graph.memory", "memory:memory-graph"),
  component("agent-loop", "agent-loop.agent", "agent:agent-loop"),
  component("orchestrator-default", "orchestrator-default.orchestrator", "orchestrator:orchestrator-default"),
];

const codex = component("codex", "codex.ai", "ai:codex");

export const AI_CHOICES: readonly Feature[] = [
  { label: "Codex with your ChatGPT account", icon: "✦", hint: "run `codex login` first", components: [codex] },
  {
    label: "Codex with an OpenAI API key",
    icon: "⌘",
    components: [codex],
    secrets: [{ env: "CODEX_API_KEY", question: "OpenAI API key", secret: true }],
  },
];

/** Exactly one is picked; it hands keys and settings to every other component. */
export const ENVIRONMENTS: readonly Feature[] = [
  {
    label: ".env file + system variables",
    icon: "✱",
    hint: "keys in .env next to plaios.yaml; exported variables also work",
    components: [
      component("env-node", "env-node.process", "env:env-node"),
      component("env-node", "env-node.dotenv", "env:env-node:2", { filePath: ".env", required: false }),
      component("env-node", "env-node.composite", "env:env-node:3"),
    ],
  },
];

/** Exactly one is picked; every component that needs storage uses it through the `database:main` instance. */
export const DATABASES: readonly Feature[] = [
  {
    label: "SQLite",
    icon: "▤",
    hint: "a single local file, nothing to install",
    components: [component("sqlite", "sqlite.database", "database:main", { databasePath: ".agent-os/data/agent-os.sqlite" })],
  },
];

export const CHANNELS: readonly Feature[] = [
  {
    label: "Telegram bot",
    icon: "✈",
    hint: "chat from your phone",
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
    label: "OpenAI-compatible HTTP API",
    icon: "⇄",
    hint: "use it from any OpenAI client",
    components: [
      component("openrouter-api", "openrouter-api.input", "input:openrouter-api"),
      component("openrouter-api", "openrouter-api.output", "output:openrouter-api"),
    ],
    secrets: [{ env: "OPENROUTER_API_KEY", question: "Key clients must send (empty = no auth)", secret: true, optional: true }],
  },
  {
    label: "Live voice",
    icon: "♪",
    hint: "talk out loud, OpenAI Realtime",
    components: [component("voice-live", "voice-live.input", "input:voice-live")],
    secrets: [{ env: "OPENAI_API_KEY", question: "OpenAI API key", secret: true }],
  },
  {
    label: "Scheduled prompts",
    icon: "◷",
    hint: "cron jobs the agent runs for you",
    components: [component("cronjob", "cronjob.input", "input:cronjob")],
  },
  {
    label: "Pattern predictor",
    icon: "∿",
    hint: "learns your habits and asks before you do",
    components: [component("pattern-predictor", "pattern-predictor.input", "input:pattern-predictor")],
    secrets: [
      { env: "AGENT_OS_USER_ID", question: "Your user name", fallback: userInfo().username },
      { env: "PATTERN_OUTPUT_CHANNEL", question: "Channel it asks you on", fallback: "telegram" },
    ],
  },
];

export const TOOLS: readonly Feature[] = [
  {
    label: "Web search",
    icon: "⌕",
    hint: "Perplexity",
    components: [component("action-perplexity-search", "perplexity-search.action", "action:perplexity-search")],
    secrets: [{ env: "PERPLEXITY_API_KEY", question: "Perplexity API key", secret: true }],
  },
  {
    label: "Home Assistant",
    icon: "⌂",
    hint: "lights, TVs, climate, sensors",
    components: [component("action-home-assistant", "home-assistant.action", "action:home-assistant")],
    secrets: [
      { env: "HOME_ASSISTANT_URL", question: "Home Assistant URL", fallback: "http://homeassistant.local:8123" },
      { env: "HOME_ASSISTANT_TOKEN", question: "Home Assistant long-lived token", secret: true },
    ],
  },
  {
    label: "Remote computers",
    icon: "◫",
    hint: "Macs and Linux over SSH, paired in the app",
    components: [component("action-ssh", "ssh.control", "action:ssh")],
  },
  {
    label: "T3 Code",
    icon: "λ",
    hint: "launch coding agents on your Mac",
    components: [component("action-t3code", "t3code.control", "action:t3code")],
    secrets: [
      { env: "T3_MCP_URL", question: "T3 Code MCP URL (e.g. https://mac.tailnet.ts.net/mcp)" },
      { env: "T3_MCP_TOKEN", question: "T3 Code token (t3 auth session issue --subject mcp-client)", secret: true },
    ],
  },
  {
    label: "God's Eye View",
    icon: "◍",
    hint: "3D globe the agent can fly around",
    components: [component("action-gods-eye-view", "gods-eye-view.action", "action:gods-eye-view")],
    secrets: [{ env: "MAPBOX_ACCESS_TOKEN", question: "Mapbox public token", secret: true }],
  },
  {
    label: "Terminal inspector",
    icon: "❯",
    hint: "safe, allowlisted read-only commands",
    components: [component("action-cli", "action-cli.action", "action:cli")],
  },
  {
    label: "Memory search",
    icon: "◈",
    hint: "deeper recall over the memory graph",
    components: [component("action-memory-retrieval", "memory-retrieval.action", "action:memory-retrieval")],
  },
  {
    label: "Developer guide",
    icon: "§",
    hint: "ask the agent how to build plugins",
    components: [component("developer-guide", "developer-guide.action", "action:developer-guide")],
  },
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

/** Appends a commented `# KEY=` placeholder for each key the .env does not mention yet. */
export function addEnvPlaceholders(source: string, keys: readonly string[]): string {
  const missing = keys.filter((key) => !new RegExp(`^\\s*#?\\s*${key}=`, "m").test(source));
  if (missing.length === 0) return source;
  return `${source}${source && !source.endsWith("\n") ? "\n" : ""}# Set up later:\n${missing.map((key) => `# ${key}=`).join("\n")}\n`;
}

// Same rule as env-node's writer, so its parser reads the value back unchanged.
function quoteEnv(value: string): string {
  return /^[A-Za-z0-9_./:@+-]*$/.test(value) ? value : JSON.stringify(value);
}

const LOGO = [
  "██████╗ ██╗      █████╗ ██╗ ██████╗ ███████╗",
  "██╔══██╗██║     ██╔══██╗██║██╔═══██╗██╔════╝",
  "██████╔╝██║     ███████║██║██║   ██║███████╗",
  "██╔═══╝ ██║     ██╔══██║██║██║   ██║╚════██║",
  "██║     ███████╗██║  ██║██║╚██████╔╝███████║",
  "╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝ ╚═════╝ ╚══════╝",
];

/** Paints text left to right from the app's blue to violet, one truecolor step per character. */
function gradient(line: string, from = [47, 124, 246], to = [168, 85, 247]): string {
  const chars = [...line];
  return chars.map((char, index) => {
    const t = chars.length > 1 ? index / (chars.length - 1) : 0;
    const [r, g, b] = from.map((start, channel) => Math.round(start + (to[channel]! - start) * t));
    return `\x1b[38;2;${r};${g};${b}m${char}`;
  }).join("") + "\x1b[0m";
}

/** Draws the logo line by line; plain text when the terminal has no truecolor. */
async function banner(): Promise<void> {
  const color = process.stdout.hasColors?.(2 ** 24) ?? false;
  console.log();
  for (const line of LOGO) {
    console.log(`  ${color ? gradient(line) : line}`);
    await sleep(color ? 45 : 0);
  }
  console.log(styleText("dim", "  the pluggable AI operating system\n"));
}

/** How to call the CLI again: plain `plaios` only when a global install put it on PATH. */
export const PLAIOS = (process.env.PATH ?? "").split(delimiter).some((dir) => dir && existsSync(join(dir, "plaios"))) ? "plaios" : "npx plaios";

const step = (index: number, total: number, message: string) => `${styleText("dim", `${index}/${total}`)}  ${message}`;

class Cancelled extends Error {}

/** Unwraps a prompt answer; Ctrl+C or Esc aborts the whole setup. */
function answer<T>(value: T): Exclude<T, symbol> {
  if (isCancel(value)) throw new Cancelled();
  return value as Exclude<T, symbol>;
}

const options = (features: readonly Feature[]) =>
  features.map((feature) => ({ value: feature, label: feature.label, hint: feature.hint, icon: feature.icon }));

export const LOCAL_REGISTRY = "http://localhost:4873";
const LOCAL_REGISTRY_COMMAND = "@plaios/registry@latest";

type RegistryChoice = "public" | "local" | "custom";

const REGISTRY_CHOICES = [
  { value: "public" as RegistryChoice, label: "Public npm", icon: "☁", hint: "registry.npmjs.org, recommended" },
  { value: "local" as RegistryChoice, label: "Local registry", icon: "⌂", hint: `PLAIOS Store on ${LOCAL_REGISTRY}, for your own plugins` },
  { value: "custom" as RegistryChoice, label: "Custom URL", icon: "✎", hint: "any npm-compatible registry" },
];

/** True when an npm registry answers its ping endpoint. */
export async function registryReachable(registry: string): Promise<boolean> {
  try {
    return (await fetch(new URL("/-/ping", `${registry}/`), { signal: AbortSignal.timeout(3000) })).ok;
  } catch {
    return false;
  }
}

/**
 * Starts @plaios/registry (Verdaccio plus the store UI) in the background; it outlives the setup.
 * It proxies npmjs, so the public @plaios packages still resolve through it.
 */
async function startLocalRegistry(projectRoot: string): Promise<boolean> {
  const logPath = join(projectRoot, ".agent-os", "registry.log");
  await mkdir(dirname(logPath), { recursive: true });
  const logFile = openSync(logPath, "a");
  const workspaceCli = fileURLToPath(new URL("../../../registry/dist/src/cli.js", import.meta.url));
  const [command, args] = existsSync(workspaceCli) ? [process.execPath, [workspaceCli]] : ["npx", ["-y", LOCAL_REGISTRY_COMMAND]];
  const child = spawn(command, args, { detached: true, stdio: ["ignore", logFile, logFile] });
  child.unref();
  const waiting = spinner();
  waiting.start("Starting the PLAIOS registry (the first run downloads it)");
  for (let attempt = 0; attempt < 90; attempt += 1) {
    if (await registryReachable(LOCAL_REGISTRY)) {
      waiting.stop(`PLAIOS registry running: store and registry on ${LOCAL_REGISTRY} (log ${logPath})`);
      return true;
    }
    if (child.exitCode !== null) break;
    await sleep(1000);
  }
  waiting.error(`The registry did not start; see ${logPath}`);
  return false;
}

const isLocal = (registry: string) => ["localhost", "127.0.0.1", "[::1]"].includes(new URL(registry).hostname);

/** Before a start: brings up the local registry when the config points at one that is down. */
export async function ensureLocalRegistry(registry: string, projectRoot: string): Promise<void> {
  if (isLocal(registry) && new URL(registry).port === "4873" && !(await registryReachable(registry))) {
    log.warn(`Nothing answers on ${registry}.`);
    await startLocalRegistry(projectRoot);
  }
}

/**
 * Pulls the picked packages and the @plaios packages they depend on through the local registry,
 * which keeps a copy of everything it proxies from npm, so the agent keeps installing offline.
 */
export async function copyToLocalRegistry(registry: string, names: readonly string[]): Promise<number> {
  const queue = [...new Set(names)];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const name = queue.shift()!;
    if (seen.has(name)) continue;
    seen.add(name);
    const response = await fetch(`${registry}/${name.replace("/", "%2F")}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`${name}: ${registry} answered ${response.status}`);
    const document = await response.json() as { "dist-tags"?: { latest?: string }; versions?: Record<string, { dist?: { tarball?: string }; dependencies?: Record<string, string> }> };
    const latest = document.versions?.[document["dist-tags"]?.latest ?? ""];
    const tarball = latest?.dist?.tarball;
    // The tarball URL points back at this registry; downloading it is what stores the copy.
    if (tarball) await (await fetch(tarball, { signal: AbortSignal.timeout(60_000) })).arrayBuffer();
    queue.push(...Object.keys(latest?.dependencies ?? {}).filter((dependency) => dependency.startsWith("@plaios/")));
  }
  return seen.size;
}

/** Package names the registry answers 404 for. */
export async function missingPackages(registry: string, names: readonly string[]): Promise<string[]> {
  const unique = [...new Set(names)];
  const found = await Promise.all(unique.map(async (name) => {
    const response = await fetch(`${registry}/${name.replace("/", "%2F")}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
    return response.status !== 404;
  }));
  return unique.filter((_, index) => !found[index]);
}

/** Asks npm (with the user's own .npmrc) to read a package; "unauthorized" means a stale token for this registry. */
async function registryAuth(registry: string): Promise<"ok" | "unauthorized" | "unknown"> {
  try {
    await promisify(execFile)("npm", ["view", "@plaios/env-node", "version", "--registry", registry, `--@plaios:registry=${registry}`], { timeout: 30_000 });
    return "ok";
  } catch (error) {
    return /E401|401 Unauthorized/.test(String((error as { stderr?: string }).stderr ?? error)) ? "unauthorized" : "unknown";
  }
}

/** Offers to drop a saved token a registry rejects; anonymous reads still work on a default Verdaccio. */
async function fixRegistryAuth(registry: string): Promise<void> {
  if ((await registryAuth(registry)) !== "unauthorized") return;
  const key = `//${new URL(registry).host}/:_authToken`;
  log.warn(`${registry} rejects the token saved in your ~/.npmrc (${key}), so installs would fail with 401.`);
  if (answer(await confirm({ message: "Remove that stale token? (log in again later with npm login to publish)" }))) {
    await promisify(execFile)("npm", ["config", "delete", key, "--location=user"]);
    log.success("Removed. Installs from the local registry now go through anonymously.");
  } else {
    log.info(`Fix it later with: npm config delete ${key}  (or npm login --registry ${registry})`);
  }
}

async function chooseRegistry(projectRoot: string): Promise<string> {
  const fromEnv = process.env.AGENT_OS_REGISTRY;
  const choice = answer(await pickOne(step(7, 7, "Where should plugins be installed from?"), REGISTRY_CHOICES));
  if (choice === "public") return DEFAULT_REGISTRY;
  if (choice === "custom") {
    return answer(await text({
      message: "Registry URL",
      initialValue: fromEnv ?? "https://",
      validate: (value) => (URL.canParse(value ?? "") ? undefined : "Enter a full URL, like https://npm.example.com"),
    }));
  }
  let running = await registryReachable(LOCAL_REGISTRY);
  if (running) {
    log.success(`Found a registry on ${LOCAL_REGISTRY}.`);
  } else if (answer(await confirm({ message: `Nothing answers on ${LOCAL_REGISTRY}. Start a local registry now?` }))) {
    running = await startLocalRegistry(projectRoot);
    if (!running) log.warn(`Start it yourself with \`npx ${LOCAL_REGISTRY_COMMAND}\` before \`${PLAIOS}\`.`);
  } else {
    log.info(`Start it with \`npx ${LOCAL_REGISTRY_COMMAND}\` before \`${PLAIOS}\`.`);
  }
  if (running) await fixRegistryAuth(LOCAL_REGISTRY);
  return LOCAL_REGISTRY;
}

/** Interactive setup. Resolves to "start" when the user wants to start now, "saved" when not, false when cancelled. */
export async function runOnboarding(configPath: string): Promise<"start" | "saved" | false> {
  try {
    await banner();
    intro(styleText(["bgBlue", "white", "bold"], " Let's set up your agent "));
    log.message(`The web chat at ${styleText("cyan", "http://localhost:3100")} is always included.\n${styleText("dim", "↑/↓ move · space pick · enter confirm · esc cancel")}`);

    if (existsSync(configPath) && !answer(await confirm({ message: `${configPath} already exists. Replace it?`, initialValue: false }))) {
      cancel("Kept the current setup.");
      return false;
    }

    const ai = answer(await pickOne(step(1, 7, "Which AI should power the agent?"), options(AI_CHOICES)));
    const environment = answer(await pickOne(step(2, 7, "Where should it read keys and settings from?"), options(ENVIRONMENTS)));
    const database = answer(await pickOne(step(3, 7, "Where should it keep its data?"), options(DATABASES)));
    const channels = answer(await pickMany(step(4, 7, "How do you want to reach it?"), options(CHANNELS)));
    const tools = answer(await pickMany(step(5, 7, "What should it be able to do?"), options(TOOLS)));
    const features = [ai, environment, database, ...channels, ...tools];

    // Features with keys can be configured now or left for later; they show up red until their keys are set.
    const needsKeys = features.filter((feature) => feature.secrets?.some((secret) => !secret.optional));
    const now = needsKeys.length === 0 ? [] : answer(await pickMany(step(6, 7, "Enter keys now for… (unpick to set up later)"), options(needsKeys), needsKeys));
    const later = needsKeys.filter((feature) => !now.includes(feature));

    const env: Record<string, string> = {};
    env.CODEX_MODEL = answer(await text({ message: "Model", initialValue: "gpt-5.6-sol" })) || "gpt-5.6-sol";
    const pending: string[] = [];
    for (const feature of features) {
      const deferred = later.includes(feature);
      for (const secret of feature.secrets ?? []) {
        if (secret.env in env || pending.includes(secret.env)) continue;
        if (deferred) {
          pending.push(secret.env);
          continue;
        }
        const message = `${feature.label} · ${secret.question}`;
        const validate = (value: string | undefined) => (value || secret.optional ? undefined : "Required. Press Esc to cancel.");
        const value = secret.secret
          ? answer(await password({ message, validate }))
          : answer(await text({ message, initialValue: secret.fallback, validate }));
        if (value) env[secret.env] = value;
      }
    }
    const registry = await chooseRegistry(dirname(configPath));
    // A package the registry lacks would stop the whole host at install time, so leave it out now.
    if (await registryReachable(registry)) {
      const missing = await missingPackages(registry, features.flatMap((feature) => feature.components.map((component) => component.package)));
      const dropped = features.filter((feature) => feature.components.some((component) => missing.includes(component.package)));
      if (dropped.length > 0) {
        log.warn(`Not in ${registry} yet, so left out: ${dropped.map((feature) => feature.label).join(", ")}. Add them later from the Store.`);
        features.splice(0, features.length, ...features.filter((feature) => !dropped.includes(feature)));
        later.splice(0, later.length, ...later.filter((feature) => !dropped.includes(feature)));
      }
    }

    const saving = spinner();
    saving.start("Assembling your agent");
    const config = buildOnboardingConfig(registry, features);
    await writeDynamicAppConfig(configPath, config);
    const envPath = join(dirname(configPath), ".env");
    const current = existsSync(envPath) ? await readFile(envPath, "utf8") : "";
    await writeFile(envPath, addEnvPlaceholders(mergeEnv(current, env), pending), { encoding: "utf8", mode: 0o600 });
    await sleep(500); // long enough to see the spinner; the writes themselves are instant
    saving.stop(`Assembled ${config.components.length} components`);

    note(features.map((feature) => `${later.includes(feature) ? styleText("yellow", "○") : styleText("green", "●")} ${feature.icon ?? "•"}  ${feature.label}`).join("\n"), "Your agent");
    if (later.length > 0) {
      log.warn(`Set up later: ${later.map((feature) => feature.label).join(", ")}.\nFill ${pending.join(", ")} in ${envPath}, or open the component in the control plane.`);
    }
    if (registry === LOCAL_REGISTRY && (await registryReachable(registry))) {
      const copying = spinner();
      copying.start("Copying your plugins into the local registry");
      try {
        const count = await copyToLocalRegistry(registry, config.components.map((component) => component.package));
        copying.stop(`Copied ${count} packages into the local registry`);
      } catch (error) {
        copying.error(`Could not copy every plugin (${error instanceof Error ? error.message : String(error)}); they will download on first start.`);
      }
    }
    log.message(`Plugins come from ${styleText("cyan", registry)}. Switch any time in Settings → Registry, or with ${styleText("cyan", `${PLAIOS} --registry <url>`)}.`);
    const links = [`${styleText("cyan", "➜")}  Agent   ${styleText(["cyan", "bold"], `http://localhost:${config.server.port}`)}  ${styleText("dim", "once it starts")}`];
    if (registry === LOCAL_REGISTRY) links.push(`${styleText("cyan", "➜")}  Store   ${styleText(["cyan", "bold"], LOCAL_REGISTRY)}`);
    log.message(links.join("\n"));
    const start = answer(await confirm({ message: "Start PLAIOS now?" }));
    outro(start
      ? "Starting your agent…"
      : `Saved ${configPath}. Start it with ${styleText("cyan", PLAIOS)}; change anything later with ${styleText("cyan", `${PLAIOS} init`)} or from the control plane.`);
    return start ? "start" : "saved";
  } catch (error) {
    if (!(error instanceof Cancelled)) throw error;
    cancel("Setup cancelled. Nothing was written.");
    return false;
  }
}
