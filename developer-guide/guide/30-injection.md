---
id: injection
part: Superpowers
title: What the host hands your constructor
tagline: One options object, assembled from your manifest. Every key, and exactly when you get it.
---
You never import another plugin. You **declare**, and the host **injects**. Everything arrives in the single object passed to `new YourClass(options)`.

## Every key

| Key | You get it when | What it is |
|---|---|---|
| `cwd`, `workingDirectory` | always | the folder holding `agent-os.yaml` |
| `env` | an environment is installed | the composite environment, else the first one |
| `memory` | a memory is installed | the first memory component |
| `database` | a database is installed | a view scoped to your instance id (`action:foo` → `action-foo`) |
| `model` | you are an `orchestrator` or `agent`, or list `discovery` | a System 2 instance |
| `capabilityDiscovery` | same as `model` | the capability registry |
| `system1`, `system2` | you list them in `required` or `optional` | the chosen model instance |
| `providers` | your class is `CompositeEnvironment` | every other environment |
| *your config keys* | always | resolved config values, see [Configuration and secrets](#config) |

## Which model you get

With several models, the host picks by your component config `system1Instance` / `system2Instance` (an instance id), then the one whose config has `role: routing`, then the first.

## A typed options interface

Spell it out, so a missing dependency is a type error and not a runtime surprise:

```ts src/action.ts
import type { Database, Environment, Memory, System1, System2 } from "@agent-os/core/domain";

export interface HomeLightsOptions {
  env: Environment;
  system2: System2;          // required: [system2]
  system1?: System1;         // optional: [system1]
  database?: Database;       // optional: [database]
  memory?: Memory;
  baseUrl: string;           // config key
  timeoutMs?: number;        // config key with a default
}
```

> **Tip** `required` versus `optional` is documentation for the person installing you. Injection works the same for both: if the kind is installed, you get it. Check optional ones for `undefined`.

> **Careful** Two interfaces that share a `className` share one instance, built with the **first** interface's options. Give both interfaces the same `required` and `optional` so that first options object has everything.
