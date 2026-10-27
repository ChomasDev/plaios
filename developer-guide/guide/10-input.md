---
id: input
part: The components
title: Inputs
tagline: Anything that can produce a sentence can talk to your agent.
kinds: input
---
Telegram, the HTTP API, cron jobs, the voice line and this very chat are all inputs. An input has exactly one job: **notice something and hand the host a message**.

## The contract

```ts @agent-os/core/domain
export interface InputInterface {
  readonly channel: InputChannel;           // "telegram", "cron", "web"...
  start(listener: InputListener): Promise<void>;
  stop(): Promise<void>;
}

export type InputListener = (message: InputMessage) => void | Promise<void>;

export interface InputMessage {
  id: string;
  channel: InputChannel;
  sessionId: string;              // groups turns into a conversation
  userId?: string;                // enables long-term memory for this person
  text: string;
  attachments?: readonly InputAttachment[];   // { type: "image"; path; mediaType? }
  createdAt: Date;
  metadata?: Readonly<Record<string, unknown>>;
}
```

## A complete webhook input

```ts src/input.ts
import { createServer, type Server } from "node:http";
import { randomUUID } from "node:crypto";
import type { InputInterface, InputListener } from "@agent-os/core/domain";

export class WebhookInput implements InputInterface {
  readonly channel = "webhook";
  private server?: Server;

  constructor(private readonly options: { port: number }) {}

  async start(listener: InputListener): Promise<void> {
    this.server = createServer(async (request, response) => {
      let body = "";
      for await (const chunk of request) body += chunk;
      const { text, sender } = JSON.parse(body) as { text: string; sender: string };
      response.writeHead(202).end();
      await listener({
        id: randomUUID(),
        channel: this.channel,
        sessionId: `webhook:${sender}`,
        userId: sender,
        text,
        createdAt: new Date(),
      });
    });
    await new Promise<void>((resolve) => this.server!.listen(this.options.port, resolve));
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve) => this.server ? this.server.close(() => resolve()) : resolve());
  }
}
```

## How it plugs in

- **`start` is called once**, when the runtime boots, under a supervisor. If it throws, the host calls `stop()` and starts you again after one second.
- `start` may resolve right away (like above, a server keeps running) or stay pending (a polling loop). Either works.
- **`stop` is called on every reload**: saving config, installing a package, toggling a component. Release ports, timers and sockets there, or the next `start` will collide with your own ghost.
- Your `channel` is your name in routing. The orchestrator replies to the input's channel by default, so an input usually ships with an output of the same channel.

## Choosing ids that make memory work

- **`sessionId`** decides which history the model sees. One per chat, per thread, per caller.
- **`userId`** decides whose long-term memory is recalled. Leave it out and the agent remembers the conversation but not the person.
- **`metadata.preferredOutputChannel`** is a hint some orchestrators honour (the web chat sets `"web"`).

> **Tip** Need to know when a reply goes out? Ship an output with the same `channel`. Inputs never see replies, on purpose: it keeps every input usable with any output.

> **Careful** Two instances of your input on the same port means a crash loop. If people may enable it twice, make the port configurable.
