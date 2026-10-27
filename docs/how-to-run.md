# How to run Agent OS

From an empty machine to chatting with your agent at `http://localhost:3100`.

The host (`app-dynamic`) installs plugins **from an npm registry**, not from the workspace. So running Agent OS is: build the workspace, publish the plugins to a local registry, then `pnpm agentos` and answer a few questions.

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

## 4. Start

```bash
pnpm agentos
```

The first time, there is no `agent-os.yaml`, so a short setup runs in the terminal:

```text
Welcome to Agent OS. Let's set up your agent.
(The web chat at http://localhost:3100 is always included.)

Which AI should power the agent?
  1. Codex, signed in with `codex login` (ChatGPT account)
  2. Codex, with an OpenAI API key
Choose [1]:

Where else do you want to talk to it?
  1. Telegram bot
  2. OpenAI-compatible HTTP API (use it from any OpenAI client)
  3. Live voice (OpenAI Realtime)
Numbers, comma-separated (empty for none): 1

Which tools should it have?
  1. Web search (Perplexity)
  ...
```

It asks only for the keys your choices need (typed keys are hidden), writes `agent-os.yaml` (the component graph) and `.env` (the secrets, merged into any existing one), then starts. Every later `pnpm agentos` starts straight away; run `pnpm agentos init` to redo the setup.

The host then:

1. installs every package into `.agent-os/runtime` from the registry (it uses `npx pnpm` if pnpm is not installed),
2. builds the components in dependency order (env, AI, database, discovery, memory, agent, orchestrator),
3. serves the control plane on **http://localhost:3100**.

Open it, go to the chat and ask something. A component that fails (for example, a missing secret) is shown in red on its own page; the rest keep running.

Useful flags:

```text
pnpm agentos --config ./examples/agent-os.full.yaml   # another graph (the full reference setup)
             --registry http://host:4873              # override the registry
             --port 3200
             --no-install                             # skip installing, use what is in .agent-os/runtime
```

## 5. Add more plugins

From the UI: open **Store**, pick a package, press **Install**. The host installs it, adds it to `agent-os.yaml` with its defaults, and loads it without a restart.

Some popular ones and the secrets they read from `.env`:

| Package | Needs |
| --- | --- |
| `@agent-os/telegram` (input + output) | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |
| `@agent-os/action-home-assistant` | `HOME_ASSISTANT_URL`, `HOME_ASSISTANT_TOKEN` |
| `@agent-os/action-perplexity-search` | `PERPLEXITY_API_KEY` |
| `@agent-os/cronjob` | nothing; schedules prompts |
| `@agent-os/voice-live` | `OPENAI_API_KEY`; the mic works on `localhost` or HTTPS only |

## 6. Write your own

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
