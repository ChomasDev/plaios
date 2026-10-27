---
id: anatomy
part: Start here
title: Anatomy of a package
tagline: One npm package, one manifest, any number of interfaces.
---
A plugin is an ordinary npm package with one extra file: `agent-os.package.yaml`. That file is the whole contract between you and the host.

```text package layout
my-plugin/
├─ agent-os.package.yaml   what you are, what you need
├─ package.json            exports for the class and the web entry
├─ src/
│  └─ index.ts             your class(es)
└─ web/
   ├─ styles.css           optional, Tailwind-ready
   └─ action/index.tsx     the page microfrontend (default ./web/<kind>)
```

## The manifest

```yaml agent-os.package.yaml
schemaVersion: 1
id: weather
name: Weather
version: 0.1.0
description: Live forecasts for the agent
interfaces:
  - id: weather.action
    kind: action
    name: WeatherCapability
    className: WeatherCapability
    description: Answers forecast questions for any city
    required: [env]
    config:
      - key: apiKey
        env: WEATHER_API_KEY
        type: secret
        required: true
        description: Your weather provider key
    startup: { when: ifConfigured }
```

Every field the host actually reads:

| Field | Required | What it does |
|---|---|---|
| `schemaVersion` | yes | Must be `1`. |
| `id`, `name`, `version` | yes | Non-empty strings. Keep `version` equal to `package.json`. |
| `interfaces[]` | yes | At least one. Each becomes a component you can enable in Build. |
| `interfaces[].id` | yes | Unique id, conventionally `<package-id>.<kind>`. |
| `interfaces[].kind` | yes | One of `env`, `system1`, `system2`, `discovery`, `database`, `memory`, `orchestrator`, `agent`, `input`, `output`, `action`. |
| `entry` | no | Package export holding the class. Default `.` (your `main`). |
| `className` | no | The exported class to construct with `new`. |
| `export` | no | Used as the export name when `className` is absent. Default `.`. |
| `config[]` | no | Settings with UI, env fallback and defaults. See [Configuration and secrets](#config). |
| `required`, `optional` | no | Kinds you want handed to your constructor. See [What the host hands you](#injection). |
| `startup.when` | no | `always`, `ifConfigured` or `manual`. Only `manual` changes behaviour today: the Store does not enable it on install. |
| `web` | no | Page microfrontend. Defaults to `{ entry: ./web/<kind>, export: default, styles: ./web/styles.css }`. |

> **Careful** `surfaces`, `permissions` and a `capability:` block appear in some manifests, but the host does not read them. Put the real capability manifest on your class.

## How the host finds your code

The host resolves `entry` and `web.entry` through **`package.json` exports**, exactly like Node does, including `*` wildcards. Both must start with `./` and stay inside your package.

```json package.json
{
  "type": "module",
  "main": "./dist/src/index.js",
  "exports": {
    ".": { "types": "./dist/src/index.d.ts", "import": "./dist/src/index.js" },
    "./web/*": { "types": "./dist/web/*/index.d.ts", "import": "./dist/web/*/index.js" },
    "./web/styles.css": "./web/styles.css"
  },
  "files": ["dist", "web", "agent-os.package.yaml"]
}
```

Then it constructs you: `new YourClass(options)`. That is the entire lifecycle contract. No registry, no global, no singleton.

## One class, several interfaces

Two interfaces with the same package and the same `className` share **one instance**. The host constructs it once and reuses it.

This is how the cron plugin is an `input` (it fires scheduled prompts) *and* a capability (the agent can add jobs) with a single object. A job added by the agent is live immediately, because the listener and the tool are the same object.

## Load order

The host loads kinds in dependency order, so whatever you `require` already exists:

`env` → `database` → `memory` → `system1` / `system2` → `discovery` → `input` / `output` / `action` → `agent` → `orchestrator`
