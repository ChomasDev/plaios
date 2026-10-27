---
id: memory
part: The components
title: Memory
tagline: The only component that is called before, during and after every turn.
kinds: memory
---
Memory is the most connected box on the map. Replace it, and you change what the agent knows about everyone it has ever talked to.

## The contract

```ts @agent-os/core/domain
export type MemoryKind = "working" | "semantic" | "episodic" | "procedural";

export interface MemoryEntry<T = unknown> {
  id: string; kind: MemoryKind; content: T; createdAt: Date;
  addedMemoryDate?: Date; factDate?: Date; updatedAt?: Date;
  userId?: string; sessionId?: string;
  importance?: number; confidence?: number;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface MemoryQuery {
  text?: string; kinds?: readonly MemoryKind[];
  userId?: string; sessionId?: string;
  limit?: number; minImportance?: number;
  metadata?: Readonly<Record<string, unknown>>;
  order?: "oldest" | "newest";
}

export interface Memory {
  remember(entry: MemoryEntry): Promise<void>;
  get(id: string): Promise<MemoryEntry | undefined>;
  recall(query?: MemoryQuery): Promise<readonly MemoryEntry[]>;
  forget(id: string): Promise<boolean>;
  clear(query?: MemoryQuery): Promise<number>;
  close?(): Promise<void>;
}
```

## Exactly how the host uses you

| When | Call | Query or entry |
|---|---|---|
| Before thinking | `recall` | `{ sessionId, kinds: ["working"], metadata: { namespace: "chat-history" }, limit: 10, order: "newest" }` |
| Before thinking, in parallel | `recall` | `{ text, kinds: ["semantic", "episodic", "procedural"], userId, limit: 10, order: "newest" }` (only with a `userId`) |
| User turn | `remember` | `kind: "working"`, id `chat-user-<id>`, `metadata: { namespace: "chat-history", role: "user", channel }` |
| After the decision | `remember` | each proposal, id `user-memory-<uuid>`, `metadata: { namespace: "user-memory", reason, sourceChannel }` |
| After the answer | `remember` | `kind: "working"`, `role: "assistant"` |

So the minimum viable memory must:

1. **Filter by `metadata`** (exact match on the keys given). Chat history depends on it.
2. **Honour `order` and `limit`**. The host reverses "newest 10" into chronological history.
3. **Rank by `text`** when it is present. This is your semantic search: keywords, embeddings, a graph walk, your choice.

## Bonus hooks

- If your memory has a `link(...)` method, the host calls it to connect a new turn to the memories that were recalled for it. The graph memory uses this to grow edges.
- Expose a capability on the same class (like `memory.retrieval`) and the agent can search you *mid-thought*, with follow-up queries.

## Storage

Memory loads right after the database, so `options.database` is ready in your constructor. Create your tables on first use. See [The database](#database).

> **Tip** `content` is `unknown` on purpose. The default memory stores strings, but a graph memory stores nodes. Whatever you store, `recall` must give back entries the host can print: put readable text in `content` or a `metadata.text`.

> **Careful** Only the **first** memory component is used. Installing a second one does not merge them; it is silently ignored.
