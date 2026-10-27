---
id: action
part: The components
title: Capabilities and actions
tagline: Give the agent a new power, with inputs it cannot get wrong.
kinds: action
---
A capability is a typed function the model can call. Home Assistant, SSH, web search, cron management and memory retrieval are all capabilities. It's where most plugins start, and where most of the magic happens.

## The contract

```ts @agent-os/core/domain
export interface Capability<TInput = unknown, TOutput = unknown> {
  readonly manifest: CapabilityManifest;
  initialize?(): Promise<void>;
  execute(input: TInput, context: CapabilityExecutionContext): Promise<CapabilityResult<TOutput>>;
  /** Chat components the model may write into an answer. [] when none. */
  uiComponents(): readonly UIComponentSpec[];
  /** Markdown the agent reads on demand before using you. */
  docs(): string;
}

export interface CapabilityManifest {
  id: string;                   // stable id, e.g. "web.search"
  name: string;                 // the function name the model sees: search_web
  description: string;          // when to use it, in one or two sentences
  inputSchema: JsonSchema;      // strict JSON Schema for the arguments
  version?: string;
  outputSchema?: JsonSchema;
  permissions?: readonly string[];
  tags?: readonly string[];     // keywords discovery matches on
  execution?: { timeoutMs?: number; idempotent?: boolean };
  examples?: ReadonlyArray<{ request: string; arguments?: unknown }>;
}

export type CapabilityResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; retryable?: boolean; details?: unknown } };

export interface CapabilityExecutionContext {
  runId: string; callId: string;
  sessionId?: string; userId?: string;
  startedAt: Date;
  signal?: AbortSignal;          // pass it to fetch: cancelled turns stop your work
  metadata?: Readonly<Record<string, unknown>>;
}
```

## Who reads what

Each field of your manifest has exactly one audience. Write each for that reader:

| Field | Read by | Write it as |
|---|---|---|
| `name`, `description`, `tags` | the orchestrator, to pick tools | "Use it when..." plus every word a user might say |
| `name`, `description`, `inputSchema` | the model, as a function definition | precise argument descriptions with an example |
| `tags`, `examples` | discovery, for keyword search | synonyms, other languages, nouns |
| `docs()` | the model, **on demand**, via `read_capability_docs` | the manual: when not to use it, limits, examples |
| `uiComponents()` | the model, in the web chat prompt | see [Chat components](#chat-components) |

## The result is a conversation

`data` goes back to the model as the function result. Make it **small and meaningful**:

- Return what the model needs to answer, not your raw API payload. A `summary` string is a gift.
- Return `success: false` with a stable `code` and a human `message`. Set `retryable: true` only if trying again can actually help.
- Never throw for expected failures. Throwing works, but the model gets a generic error instead of your helpful one.

## The direct path: skipping the model

If your capability can act on raw user text by itself (like the Jev Home Assistant action, which turns "spegni la luce in cucina" into a service call), tag it `direct`. When an orchestrator is confident only you are needed, it sets `bypassModel`, and the agent loop calls `execute` with the raw text and history, then returns your `summary` as the answer. A sub-second reply, no generative model involved.

## Being a capability without being an action

The host registers **every** component instance that has a `manifest` and an `execute`, whatever its kind. The cron input and the graph memory are capabilities too. So if your memory, input or output would benefit from a tool ("list my scheduled jobs"), just implement `Capability` on the same class.

> **Tip** Strict schemas need every property in `required`. Model "optional" as `type: ["string", "null"]` and treat `null` as "not given". Models handle this perfectly.

> **Careful** The host never calls `initialize()` today. Do your setup lazily on the first `execute`, or in the constructor if it cannot fail.
