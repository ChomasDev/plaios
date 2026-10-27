---
id: env
part: The components
title: The environment
tagline: Where configuration and secrets come from, before anything else exists.
kinds: env
---
Environment components load first, because everything else reads from them. The shipped ones read `process.env`, a `.env` file, a fixed map, and a **composite** that layers the others.

## The contract

```ts @plaios/core/domain
export interface Environment {
  get(key: string): string | undefined;
  getRequired(key: string): string;               // throws when missing
  getOrDefault(key: string, fallback: string): string;
  has(key: string): boolean;
  getAll(): Record<string, string>;
}
```

## How you receive it

Every component gets `options.env`: the composite environment when one is installed, otherwise the first environment. Declaring `required: [env]` documents that you depend on it.

The host also uses it for you: a config field with `env: WEATHER_API_KEY` is filled from `env.get("WEATHER_API_KEY")`, then `process.env`, before your constructor runs. See [Configuration and secrets](#config).

## Writing one

A vault-backed environment is the classic case:

```ts src/env.ts
import type { Environment } from "@plaios/core/domain";

export class VaultEnvironment implements Environment {
  private readonly values: Record<string, string>;
  constructor(options: { values?: Record<string, string> }) { this.values = options.values ?? {}; }
  get(key: string) { return this.values[key]; }
  has(key: string) { return key in this.values; }
  getRequired(key: string) { const value = this.get(key); if (value === undefined) throw new Error(`Missing ${key}`); return value; }
  getOrDefault(key: string, fallback: string) { return this.get(key) ?? fallback; }
  getAll() { return { ...this.values }; }
}
```

> **Careful** Your constructor is synchronous and runs at boot. If your secrets live behind a network call, load them into memory before the host starts, or resolve lazily inside `get`.

> **Careful** The composite environment receives `options.providers`, every other environment instance. Only the class named `CompositeEnvironment` gets that list.
