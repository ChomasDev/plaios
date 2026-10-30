---
name: create-plaios-plugin
description: Create, build, test and publish a PLAIOS plugin package (input, output, action, memory, orchestrator, agent, discovery, database, system1, system2 or env). Use when the user wants a new plugin, capability, tool, channel or integration for PLAIOS, or asks how to package, test or publish one.
---

# Create a PLAIOS plugin

A plugin is an npm package with one extra file, `agent-os.package.yaml`. The host installs it from a registry, reads the manifest, constructs the class and shows its page. The full reference is the developer guide in `developer-guide/guide/*.md` (also at `/docs/` on the website). Read the chapter for the kind you are building before writing code:

| Building | Read |
| --- | --- |
| Any plugin | `03-anatomy.md`, `04-quickstart.md`, `30-injection.md`, `31-config.md`, `36-sharp-edges.md` |
| `input` / `output` | `10-input.md`, `11-output.md` |
| `action` (a tool the agent calls) | `12-action.md` |
| `memory`, `orchestrator`, `agent`, `discovery` | `13-memory.md` … `16-discovery.md` |
| `system1` / `system2` (models) | `17-models.md` |
| `database`, `env` | `18-database.md`, `19-env.md` |
| A page or chat components | `32-pages.md`, `33-chat-components.md` |
| Publishing | `35-ship.md` |

## 1. Scaffold

From the repository root, never by hand:

```bash
pnpm plaios create <kinds> <name>          # e.g. pnpm plaios create action weather
pnpm plaios create input,output discord    # several kinds in one package
pnpm plaios create --kind action --name weather --yes   # non-interactive
```

Kinds: `input`, `output`, `action`, `agent`, `orchestrator`, `discovery`, `database`, `memory`, `system1`, `system2`, `env`. It writes `packages/<name>/` with the manifest, `package.json` (keywords already set), one class per kind in `src/<kind>.ts` re-exported from `src/index.ts`, a page per kind in `web/<kind>/index.tsx` and `web/styles.css`. Run `pnpm install` afterwards so the workspace links it.

## 2. Implement

- **The class** in `src/<kind>.ts` (fill in its TODOs). The host constructs it with one options object: your `config` values, plus `env`, `database`, `memory`, `model`, `system1`, `system2` or `capabilityDiscovery` when the manifest asks for them (`30-injection.md`).
- **Return values** from capabilities are `{ success: true, data }` or `{ success: false, error: { code, message } }`. Tool input schemas are strict: list every property in `required` and use `null` for "not given".
- **Config and secrets** go in the manifest's `config[]` with an `env` fallback (`type: secret` for keys). Never hard-code keys or read `process.env` directly.
- **The manifest** declares what you need in `required` / `optional`. Keep its `version` equal to `package.json`.
- **Every `input` needs a `web` page.** The host flags an input without one as a runtime error.
- **Keep `plaios` in `keywords`.** The Store finds packages by it and groups them by the kind keywords the scaffold adds.
- Set up lazily: `initialize()` is never called. Release every port and timer in `close()` / `stop()`, because any config change rebuilds every component.

## 3. Check

```bash
cd packages/<name>
pnpm build && pnpm typecheck
```

The scaffold has no tests. Add `test/<name>.test.mjs` with `node:test` (construct the class with fake options, call it, assert the result) and a `"test": "pnpm build && node --test test/**/*.test.mjs"` script, like the packages next to it.

`files` in `package.json` must include everything the exports point to: `dist`, `web` and `agent-os.package.yaml`. Without the manifest it installs as an empty box.

## 4. Try it locally

The scaffold marks the package `"private": true` so nothing is published by accident. Remove that line (and add `"publishConfig": { "access": "public" }` for a scoped public package) when it is ready.

```bash
pnpm registry                                   # PLAIOS registry + Store on http://localhost:4873, leave it running
npm adduser --registry http://localhost:4873    # once
cd packages/<name> && pnpm publish --registry http://localhost:4873 --no-git-checks
```

Then press **Install** in the control plane's Store, or pin it in `plaios.yaml`:

```yaml
components:
  - package: "@plaios/<name>"
    version: 0.1.0
    interface: <name>.action
    instanceId: action:<name>
```

pnpm 11 refuses versions published seconds ago: add `@plaios/<name>@<version>` to `minimumReleaseAgeExclude` in `.agent-os/runtime/pnpm-workspace.yaml`, or wait.

## 5. Ship

Bump `version` in both `package.json` and `agent-os.package.yaml`, publish one package at a time (`pnpm -r publish` can hang), and publish `@plaios/core` first if you changed it. For public npm, pass `--access public --registry https://registry.npmjs.org --@plaios:registry=https://registry.npmjs.org`: the repo's `.npmrc` sends `@plaios` to the local registry otherwise.

## Done means

- `pnpm build`, `pnpm typecheck` and the package's tests pass.
- The plugin installs from the local registry and its component is not red in the control plane.
- Its config fields appear on its page, and secrets live in `.env`, not in `plaios.yaml`.
