---
id: ship
part: Superpowers
title: Build, publish, install
tagline: From your laptop to the Store to a running agent.
---
Agent OS installs plugins from an npm registry, a private Verdaccio by default. Publishing is just npm publishing.

## 1. Build

```bash terminal
pnpm build    # tsc: src and web compile into dist
pnpm test
```

Check `files` in `package.json` includes everything the exports point to: `dist`, `web` (for `styles.css`), and `agent-os.package.yaml`. A package without its manifest installs as an empty box.

## 2. Version

Bump `version` in **both** `package.json` and `agent-os.package.yaml`. Breaking a capability's input schema is a major change for the agent too.

## 3. Publish

```bash terminal
pnpm publish --registry http://<your-registry>:4873
```

`workspace:*` dependencies are rewritten to the exact versions in your workspace, so publish `@agent-os/core` first if you changed it.

## 4. Install

From the **Store**, press **Install**. The host then:

1. runs `pnpm add` for your package into `.agent-os/runtime`
2. reads your manifest and checks every interface's page resolves (or uninstalls and tells you why)
3. adds one component per interface to `agent-os.yaml`, with id `<kind>:<package-id>` and your config defaults (interfaces with `startup.when: manual` are skipped)
4. reloads the runtime

Or pin it by hand:

```yaml agent-os.yaml
components:
  - package: "@agent-os/weather"
    version: 0.1.0
    interface: weather.action
    instanceId: action:weather
    config:
      days: 3
```

On boot the host installs any pinned version that is missing, so the same `agent-os.yaml` reproduces the same agent on any machine.

## Updating

The Store shows **Update** when the registry has a newer version than the one installed. Updating rewrites the pin and restarts the host.

> **Tip** A registry that enforces a minimum release age (pnpm 11 does) will refuse a version published seconds ago. Add it to `minimumReleaseAgeExclude` in the runtime's `pnpm-workspace.yaml`, or wait.
