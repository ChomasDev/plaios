# How to run Agent OS

From an empty machine to chatting with your agent at `http://localhost:3100`.

The host (`app-dynamic`) installs plugins **from an npm registry**, not from the workspace. So running Agent OS is: build the workspace, publish the plugins to a local registry, point `agent-os.yaml` at it, start.

## 0. Prerequisites

- Node.js **22.5 or newer** (the SQLite plugin uses `node:sqlite`)
- pnpm 10 (`corepack enable` picks the version pinned in `package.json`)
- git
- An AI provider. This tutorial uses the Codex plugin: either an OpenAI API key, or the Codex CLI already logged in (`codex login`).

## 1. Clone and build

```bash
git clone --recursive https://github.com/ChomasDev/AgentOs-core.git
cd AgentOs-core
pnpm install
pnpm build
```

Forgot `--recursive`? Run `git submodule update --init --recursive`. Empty `packages/` or `app-dynamic/` folders mean the submodules are missing.

## 2. Start a local registry

Agent OS uses [Verdaccio](https://verdaccio.org), a private npm registry. In a second terminal:

```bash
npx verdaccio
```

It listens on `http://localhost:4873` and writes its config to `~/.config/verdaccio/config.yaml`. Open that file and add this block **above** the `'@*/*'` entry, so `@agent-os/*` is served only from your registry and never proxied to npmjs:

```yaml
packages:
  '@agent-os/*':
    access: $all
    publish: $authenticated
```

Restart Verdaccio, then create a user (any name and password, it is local):

```bash
npm adduser --registry http://localhost:4873
```

The repo's `.npmrc` already maps the `@agent-os` scope to `localhost:4873`.

## 3. Publish the plugins

From the repo root:

```bash
pnpm -r publish --registry http://localhost:4873 --no-git-checks
```

pnpm publishes in dependency order (`core` and `microfrontend` first) and rewrites `workspace:*` to real versions. Open `http://localhost:4873` to check that the `@agent-os/*` packages are there.

> If `pnpm -r publish` hangs, publish one package at a time: `cd packages/telegram && pnpm publish --registry http://localhost:4873 --no-git-checks`. Start with `core`, `microfrontend`, `packages/systems`, then the rest.

## 4. Configure

Secrets live in `.env`, never in `agent-os.yaml`:

```bash
cp .env.example .env
```

Fill only what the plugins you use need. For this tutorial:

```dotenv
CODEX_API_KEY=sk-...        # leave empty if you ran `codex login`
CODEX_MODEL=gpt-5.6-sol
```

`agent-os.yaml` is the component graph: which packages to install and how each instance is configured. The one in the repo is the full reference setup (Telegram, Home Assistant, God's Eye View...). For a first run, replace it with this minimal graph, which gives you the web chat with memory and tools:

```yaml
schemaVersion: 1
registry: http://localhost:4873
server:
  host: 0.0.0.0
  port: 3100
components:
  - package: "@agent-os/env-node"
    version: latest
    interface: env-node.process
    instanceId: env:env-node
    config: {}
  - package: "@agent-os/env-node"
    version: latest
    interface: env-node.dotenv
    instanceId: env:env-node:2
    config:
      filePath: .env
      exampleFilePath: .env.example
      required: false
  - package: "@agent-os/env-node"
    version: latest
    interface: env-node.composite
    instanceId: env:env-node:3
    config: {}
  - package: "@agent-os/sqlite"
    version: latest
    interface: sqlite.database
    instanceId: database:main
    config:
      databasePath: .agent-os/data/agent-os.sqlite
  - package: "@agent-os/codex"
    version: latest
    interface: codex.ai
    instanceId: ai:codex
    config:
      skipGitRepoCheck: true
      sandboxMode: read-only
      approvalPolicy: never
  - package: "@agent-os/discovery-memory"
    version: latest
    interface: discovery-memory.discovery
    instanceId: discovery:discovery-memory
    config: {}
  - package: "@agent-os/memory-graph"
    version: latest
    interface: memory-graph.memory
    instanceId: memory:memory-graph
    config: {}
  - package: "@agent-os/agent-loop"
    version: latest
    interface: agent-loop.agent
    instanceId: agent:agent-loop
    config: {}
  - package: "@agent-os/orchestrator-default"
    version: latest
    interface: orchestrator-default.orchestrator
    instanceId: orchestrator:orchestrator-default
    config: {}
```

Keep the original with `git stash` or `cp agent-os.yaml agent-os.full.yaml` first if you want to go back to it.

## 5. Start

```bash
pnpm agentos start
```

The host:

1. reads `agent-os.yaml`,
2. installs every package into `.agent-os/runtime` from the registry,
3. builds the components in dependency order (env, AI, database, discovery, memory, agent, orchestrator),
4. serves the control plane on **http://localhost:3100**.

Open it, go to the chat and ask something. A component that fails (for example, a missing secret) is shown in red on its own page; the rest keep running.

Useful flags:

```text
pnpm agentos start --config ./agent-os.full.yaml   # another graph
                   --registry http://host:4873      # override the registry
                   --port 3200
                   --no-install                     # skip installing, use what is in .agent-os/runtime
```

## 6. Add more plugins

From the UI: open **Store**, pick a package, press **Install**. The host installs it, adds it to `agent-os.yaml` with its defaults, and loads it without a restart.

Some popular ones and the secrets they read from `.env`:

| Package | Needs |
| --- | --- |
| `@agent-os/telegram` (input + output) | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |
| `@agent-os/action-home-assistant` | `HOME_ASSISTANT_URL`, `HOME_ASSISTANT_TOKEN` |
| `@agent-os/action-perplexity-search` | `PERPLEXITY_API_KEY` |
| `@agent-os/cronjob` | nothing; schedules prompts |
| `@agent-os/voice-live` | `OPENAI_API_KEY`; the mic works on `localhost` or HTTPS only |

## 7. Write your own

```bash
pnpm agentos create action weather    # → packages/weather
cd packages/weather && pnpm build
pnpm publish --registry http://localhost:4873 --no-git-checks
```

Then install it from the Store. The [quickstart chapter](../developer-guide/guide/04-quickstart.md) walks through a real weather capability.

## The edit loop

After changing a plugin: bump its `version` in **both** `package.json` and `agent-os.package.yaml`, `pnpm build`, publish, then press **Update** in the Store. After changing `core` or `microfrontend`, publish them first, then the plugins that depend on them.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `ERR_PNPM_FETCH_404` for `@agent-os/...` at start | That package is not published to the registry in `agent-os.yaml`. Publish it (step 3). |
| `EPUBLISHCONFLICT` / version already exists | Bump the version, or the `@agent-os/*` block is missing from the Verdaccio config and it is proxying npmjs. |
| Install refuses a just-published version | pnpm 11 enforces `minimumReleaseAge`. Add the version to `minimumReleaseAgeExclude` in `.agent-os/runtime/pnpm-workspace.yaml`. |
| `node:sqlite` not found | Node is older than 22.5. |
| A component is red | Open its page: it shows the error and the config/secret it is missing. |
| Check the running graph | `curl localhost:3100/api/runtime` (no `runtimeError` means healthy). |
