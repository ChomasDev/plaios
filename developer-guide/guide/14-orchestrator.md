---
id: orchestrator
part: The components
title: Orchestrators
tagline: The decision before the thinking: which tools, which destination, what to remember.
kinds: orchestrator
---
The orchestrator sees the message once, before the agent loop, and writes the plan. A great orchestrator makes a cheap model feel brilliant, because the model only ever sees the five tools that matter.

## The contract

```ts @agent-os/core/domain
export interface Orchestrator {
  orchestrate(
    message: InputMessage,
    outputs: readonly OutputInterface[],
    options?: OrchestratorOptions,
  ): Promise<OrchestrationDecision>;
  proposeMemory?(message: InputMessage, options?: OrchestratorOptions): Promise<readonly MemoryProposal[]>;
}

export interface OrchestrationDecision {
  capabilityIds: readonly string[];      // what the agent loop may use
  outputChannel: OutputChannel;          // must be one of `outputs`
  additionalOutputs?: readonly { outputChannel: OutputChannel; content: "response" | "text"; text?: string }[];
  memoryProposals?: readonly MemoryProposal[];
  deferMemoryProposal?: boolean;         // call proposeMemory after replying
  bypassModel?: boolean;                 // let a `direct` capability answer alone
  reason?: string;
}

export type MemoryProposal =
  | { operation: "remember"; kind: MemoryKind; content: unknown; reason: string; confidence?: number; factDate?: Date }
  | { operation: "forget"; memoryId: string; reason: string };
```

## What you are given

Orchestrators always receive `model` (the System 2 instance) and `capabilityDiscovery` in their options, without asking. Add `system1` by declaring it:

```yaml agent-os.package.yaml
    kind: orchestrator
    optional: [system1]   # options.system1, when one is installed
```

## The two shipped strategies

- **Default orchestrator**: one forced function call to the main model (`route_agent_message`) with every capability's id, name, description and tags. Accurate, about one model round trip.
- **Jev orchestrator**: asks System 1 one yes/no question per capability plus `memory`, `multiStep` and `output`, keeps everything scoring 0.5 or more, and sets `bypassModel` when one `direct` capability scores 0.7 or more on a single-step request. Fast, and it falls back to System 2 when System 1 fails.

## A tiny one to learn from

```ts src/orchestrator.ts
import type { CapabilityDiscovery, InputMessage, OrchestrationDecision, Orchestrator, OutputInterface } from "@agent-os/core/domain";

export class KeywordOrchestrator implements Orchestrator {
  constructor(private readonly options: { capabilityDiscovery: CapabilityDiscovery }) {}

  async orchestrate(message: InputMessage, outputs: readonly OutputInterface[]): Promise<OrchestrationDecision> {
    const text = String(message.metadata?.originalText ?? message.text);
    const found = await this.options.capabilityDiscovery.discover({ text, limit: 8 });
    const reply = outputs.find((output) => output.channel === message.channel) ?? outputs[0]!;
    return { capabilityIds: found.map((capability) => capability.id), outputChannel: reply.channel, reason: "keyword match" };
  }
}
```

> **Tip** Route on `metadata.originalText`. By the time you run, `message.text` also contains the memory and history blocks, which will confuse keyword matching.

> **Careful** `outputChannel` must exist. When unsure, fall back to the output whose `channel` equals `message.channel`, then to `outputs[0]`. Never invent a channel.
