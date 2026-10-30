# How to run PLAIOS

From an empty machine to chatting with your agent at `http://localhost:3100`.

The host (`app-dynamic`) installs plugins **from an npm registry**, not from the workspace. So running PLAIOS is: build the workspace, publish the plugins to a local registry, then `pnpm plaios` and answer a few questions.

## 0. Prerequisites

- Node.js **22.5 or newer** (the SQLite plugin uses `node:sqlite`)
- pnpm 10 (`corepack enable` picks the version pinned in `package.json`)
- git
- An AI provider. This tutorial uses the Codex plugin: either an OpenAI API key, or the Codex CLI already logged in (`codex login`).

## 1. Clone and build

```bash
git clone --recursive https://github.com/ChomasDev/plaios.git
cd plaios
pnpm install
pnpm build
```

Forgot `--recursive`? Run `git submodule update --init --recursive`. Empty `packages/` or `app-dynamic/` folders mean the submodules are missing.

## 2. Start a local registry

PLAIOS ships its own registry, `@plaios/registry`: [Verdaccio](https://verdaccio.org) plus the PLAIOS Store UI on one port. In a second terminal:

```bash
pnpm registry          # from the repo; anywhere else: npx @plaios/registry
```

It prints its URL: the Store and the npm registry are both on `http://localhost:4873`. Packages it does not have come from npmjs, so your local builds sit next to the public `@plaios/*` releases. Data and `config.yaml` live in `~/.plaios/registry`.

Create a user once (any name and password, it is local):

```bash
npm adduser --registry http://localhost:4873
```

The repo's `.npmrc` already maps the `@plaios` scope to `localhost:4873`.

## 3. Publish the plugins

From the repo root:

```bash
pnpm -r publish --registry http://localhost:4873 --no-git-checks
```

pnpm publishes in dependency order (`core` and `microfrontend` first) and rewrites `workspace:*` to real versions. Open `http://localhost:4873` to check that the `@plaios/*` packages are there.

> If `pnpm -r publish` hangs, publish one package at a time: `cd packages/telegram && pnpm publish --registry http://localhost:4873 --no-git-checks`. Start with `core`, `microfrontend`, `packages/systems`, then the rest.

## 4. Start

```bash
pnpm plaios
```

The first time, there is no `plaios.yaml`, so a short setup runs in the terminal:

```text
┌   PLAIOS    the pluggable AI operating system
│
◆  Which AI should power the agent?
│  ● Codex with your ChatGPT account (run `codex login` first)
│  ○ Codex with an OpenAI API key
│
◆  How do you want to reach it?
│  ◼ Telegram bot   ◻ OpenAI-compatible HTTP API   ◻ Live voice
│  ◼ Scheduled prompts   ◻ Pattern predictor
│
◆  What should it be able to do?
│  ◼ Web search   ◻ Home Assistant   ◼ Remote computers   ◻ T3 Code ...
│
◆  Enter keys now for… (unpick to set up later)
│  ◻ Telegram bot
│  ◼ Web search
```

Arrows move, space picks, enter confirms. It asks only for the keys your choices need (typed keys are hidden); anything you unpick in the last list is left as a `# KEY=` placeholder in `.env` and shows red in the control plane until you fill it. The last step picks where plugins come from: public npm, the PLAIOS registry on `localhost:4873` (if nothing answers there, the setup starts it in the background, logging to `.agent-os/registry.log`), or a custom URL. Switch later in **Settings → Registry**, which has one-click *Public npm* and *Local* buttons. It writes `plaios.yaml` (the component graph) and `.env` (the secrets, merged into any existing one), then starts. Every later `pnpm plaios` starts straight away; run `pnpm plaios init` to redo the setup.

The host then:

1. installs every package into `.agent-os/runtime` from the registry (it uses `npx pnpm` if pnpm is not installed),
2. builds the components in dependency order (env, AI, database, discovery, memory, agent, orchestrator),
3. serves the control plane on **http://localhost:3100**.

Open it, go to the chat and ask something. A component that fails (for example, a missing secret) is shown in red on its own page; the rest keep running.

Useful flags:

```text
pnpm plaios --config ./examples/plaios.full.yaml   # another graph (the full reference setup)
             --registry http://host:4873              # override the registry
             --port 3200
             --no-install                             # skip installing, use what is in .agent-os/runtime
```

## 5. Add more plugins

From the UI: open **Store**, pick a package, press **Install**. The host installs it, adds it to `plaios.yaml` with its defaults, and loads it without a restart.

Some popular ones and the secrets they read from `.env`:

| Package | Needs |
| --- | --- |
| `@plaios/telegram` (input + output) | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |
| `@plaios/action-home-assistant` | `HOME_ASSISTANT_URL`, `HOME_ASSISTANT_TOKEN` |
| `@plaios/action-perplexity-search` | `PERPLEXITY_API_KEY` |
| `@plaios/cronjob` | nothing; schedules prompts |
| `@plaios/voice-live` | `OPENAI_API_KEY`; the mic works on `localhost` or HTTPS only |

## 6. Write your own

```bash
pnpm plaios create action weather    # → packages/weather
cd packages/weather && pnpm build
pnpm publish --registry http://localhost:4873 --no-git-checks
```

Then install it from the Store. The [quickstart chapter](../developer-guide/guide/04-quickstart.md) walks through a real weather capability.

## The edit loop

After changing a plugin: bump its `version` in **both** `package.json` and `agent-os.package.yaml`, `pnpm build`, publish, then press **Update** in the Store. After changing `core` or `microfrontend`, publish them first, then the plugins that depend on them.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `ERR_PNPM_FETCH_404` for `@plaios/...` at start | That package is not published to the registry in `plaios.yaml`. Publish it (step 3). |
| `EPUBLISHCONFLICT` / version already exists | Bump the version. The local registry also sees every version already on public npm. |
| Install refuses a just-published version | pnpm 11 enforces `minimumReleaseAge`. Add the version to `minimumReleaseAgeExclude` in `.agent-os/runtime/pnpm-workspace.yaml`. |
| `node:sqlite` not found | Node is older than 22.5. |
| A component is red | Open its page: it shows the error and the config/secret it is missing. |
| Check the running graph | `curl localhost:3100/api/runtime` (no `runtimeError` means healthy). |
