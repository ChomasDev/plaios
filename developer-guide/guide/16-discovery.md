---
id: discovery
part: The components
title: Discovery
tagline: The phone book of every capability, and the reason you never register anything by hand.
kinds: discovery
---
At boot, after every component is constructed, the host walks all of them and calls `discovery.register(instance)` for each one that is a capability. Then the orchestrator asks discovery what exists, and the agent loop asks it for the chosen ones by id.

## The contract

```ts @plaios/core/domain
export interface CapabilityDiscovery {
  register(capability: Capability): Promise<void>;
  get(id: string, version?: string): Promise<Capability | undefined>;
  discover(query?: CapabilityDiscoveryQuery): Promise<readonly CapabilityManifest[]>;
}

export interface CapabilityDiscoveryQuery {
  text?: string;
  tags?: readonly string[];
  limit?: number;
}
```

## What the default one does

`discovery-memory` keeps capabilities in memory and scores `discover({ text })` by keyword overlap with each manifest's name, description, `tags`, `examples` and input schema. That is why tags matter: `["weather", "meteo", "pioggia"]` lets an Italian request find an English-named tool.

## Writing your own

Embeddings, usage-based ranking, per-user allowlists: discovery is the place.

- `discover()` with no query should return **everything**. Orchestrators use it to list all capabilities.
- `get(id)` must be fast and exact; the agent loop calls it for every tool on every turn.
- Every reload builds a fresh discovery instance and registers everything again, so keep `register` cheap and do not rely on state surviving a reload.

> **Tip** A plugin of any kind can ask for discovery with `required: [discovery]`. It then receives `capabilityDiscovery` and `model` in its options, which is how a capability can call *other* capabilities.
