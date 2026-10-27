---
id: agent
part: The components
title: The agent loop
tagline: Where the model meets the tools, step after step.
kinds: agent
---
The agent loop takes the plan and makes it happen: it loads the chosen capabilities, hands them to the model as functions, runs every call the model makes, and returns the final answer. Write your own when you want a different way of thinking, like planning first, voting between models, or a hard budget.

## The contract

```ts @agent-os/core/domain
export interface AgentLoop {
  run(message: InputMessage, options: AgentLoopOptions): Promise<AIProcessResult>;
}

export interface AgentLoopOptions {
  capabilityIds: readonly string[];   // from the orchestrator
  stream: boolean;                    // false when AI_STREAM=false
  signal?: AbortSignal;
  onEvent?: AgentLoopEventHandler;    // feeds telemetry
  bypassModel?: boolean;              // run the capability directly
}

export type AIProcessResult =
  | { type: "text"; text: string }
  | { type: "stream"; stream: AsyncIterable<string> };
```

Like orchestrators, agent loops always receive `model` and `capabilityDiscovery` in their options.

## The default loop, in 20 lines

```ts src/agent.ts
import type { AgentLoop, AgentLoopOptions, AIExecutableFunctionDefinition, AIProcessResult, CapabilityDiscovery, InputMessage, System2 } from "@agent-os/core/domain";

export class SimpleAgentLoop implements AgentLoop {
  constructor(private readonly options: { model: System2; capabilityDiscovery: CapabilityDiscovery }) {}

  async run(message: InputMessage, options: AgentLoopOptions): Promise<AIProcessResult> {
    const ids = ["memory.retrieval", "agent-os.docs", ...options.capabilityIds];
    const capabilities = (await Promise.all([...new Set(ids)].map((id) => this.options.capabilityDiscovery.get(id)))).filter((item) => item !== undefined);
    const functions: AIExecutableFunctionDefinition[] = capabilities.map((capability) => ({
      name: capability.manifest.name,
      description: capability.manifest.description,
      inputSchema: capability.manifest.inputSchema,
      strict: true,
      execute: (args, context) => capability.execute(args, { runId: message.id, callId: context.callId, sessionId: message.sessionId, userId: message.userId, startedAt: new Date(), signal: context.signal }),
    }));
    const instructions = ["You are Agent OS.", String(message.metadata?.instructions ?? "")].join("\n");
    return this.options.model.processWithFunctions(message.text, functions, { stream: options.stream, instructions, signal: options.signal, maxSteps: 25 });
  }
}
```

## Things the host expects you to respect

- **`metadata.instructions`** carries the chosen output's formatting rules, including the full chat component library in the web chat. Append it to your system instructions or the web chat cannot draw cards.
- **Always load `memory.retrieval` and `agent-os.docs`** (the default loop's `alwaysCapabilityIds`). The first lets the model dig deeper into memory; the second lets it read any capability's manual.
- **Emit `onEvent`** (`capability.started`, `capability.completed`, `capability.failed`) if you want your runs to show in telemetry.
- **Images**: when `message.attachments` holds images, pass `{ text, images }` as the `AIInput` so vision models can see them.

> **Tip** `bypassModel` means "the orchestrator is sure". The default loop then runs each chosen capability with the raw user text and history, and joins their `summary` fields into the answer. No model call at all: that is the sub-second path.
