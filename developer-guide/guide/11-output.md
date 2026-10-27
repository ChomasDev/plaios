---
id: output
part: The components
title: Outputs
tagline: The last mile, and the only part that knows what "sent" means.
kinds: output
---
An output receives the answer and delivers it. That is all. But two optional fields make it smarter than it looks.

## The contract

```ts @agent-os/core/domain
export type OutputContent = string | AsyncIterable<string>;

export interface OutputInterface {
  readonly channel: OutputChannel;
  /** Routing guidance: tells an orchestrator when to pick this output. */
  readonly description?: string;
  /** Formatting guidance: handed to the model when this output is chosen. */
  readonly instructions?: string;
  write(content: OutputContent): Promise<void>;
}
```

## Streaming, or not

`write` gets either a **string** or an **async iterable of chunks**:

- When the answer goes to **one** output, you get the live stream. Render it as it arrives.
- When it goes to **several**, the host buffers it and every output gets the finished string.

Handle both, always:

```ts src/output.ts
import type { OutputContent, OutputInterface } from "@agent-os/core/domain";

export class SlackOutput implements OutputInterface {
  readonly channel = "slack";
  readonly description = "Posts to the team's #agent channel. Use when the user says 'tell the team' or 'post on Slack'.";
  readonly instructions = "Slack message: short, Slack markdown (*bold*, bullet lists), no headings.";

  constructor(private readonly options: { webhookUrl: string }) {}

  async write(content: OutputContent): Promise<void> {
    const text = typeof content === "string" ? content : await collect(content);
    await fetch(this.options.webhookUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
  }
}

async function collect(stream: AsyncIterable<string>): Promise<string> {
  let text = "";
  for await (const chunk of stream) text += chunk;
  return text;
}
```

## Why `description` and `instructions` matter

- **`description`** is how "send this to my team" ends up in Slack instead of the chat it was typed in. The orchestrator reads every output's description when it picks `outputChannel` and any `additionalOutputs`.
- **`instructions`** reaches the model as `metadata.instructions` for this turn only. Telegram can ask for short plain text while the web chat asks for rich components, from the very same agent.

> **Tip** If the user wrote from Telegram but the answer goes to Slack, the host tells the model so in a "Delivery context" note, so it does not say "here you go" to the wrong room.

> **Careful** If an orchestrator names an `outputChannel` that no installed output has, the turn fails. Your channel string is an API: never rename it casually.
