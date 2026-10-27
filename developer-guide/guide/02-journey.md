---
id: journey
part: Start here
title: One message, start to finish
tagline: Follow a single "turn on the garage light" through every component it touches.
---
Before you build a part, watch the machine run.

Here is exactly what happens, in order, when any input hands the host a message. This is `AgentRuntime.process`, step by step.

## 1. An input fires

Every input's `start(listener)` is called once at boot, under a supervisor. When your input calls `listener(message)`, the turn begins. If `start` throws, the host calls `stop()` and tries again one second later. Your input never needs its own retry loop for crashes.

## 2. Memory adds context

Before anyone thinks, memory is asked two things **in parallel**:

- the last 10 turns of this session (`kinds: ["working"]`, `metadata.namespace: "chat-history"`)
- up to 10 relevant long-term memories for this user (`kinds: ["semantic", "episodic", "procedural"]`, only when the message has a `userId`)

The host rebuilds `message.text` into three blocks: *Relevant memory*, *Conversation history*, *Current request*. The original text stays in `metadata.originalText`.

## 3. The user's turn is saved

Right away, as a `working` entry with id `chat-user-<message id>`. If the request was a "remember this protocol" instruction, the host confirms it and the turn ends here.

## 4. The orchestrator decides

`orchestrator.orchestrate(message, outputs)` returns an `OrchestrationDecision`: which capability ids the agent may use, which output gets the answer, what to remember, and whether the model can be skipped entirely.

## 5. Proposed memories are stored

Every `remember` proposal in the decision is saved for the user, unless an entry with the same content already exists.

## 6. The agent loop does the work

`agentLoop.run(message, { capabilityIds, stream, bypassModel })`. Before the call, the host adds `metadata.deliveryOutputChannel` and, if the chosen output has `instructions`, `metadata.instructions`, so the model knows how to format for its destination.

## 7. Outputs deliver

One output gets the stream live, token by token. Several outputs get the finished text. Extra copies the orchestrator asked for (`additionalOutputs`) go out too.

## 8. Memory keeps the answer

The assistant turn is saved. If the orchestrator set `deferMemoryProposal`, it is asked for memories *after* the reply, without making the user wait.

> **Tip** Notice who never talks to whom. Inputs do not know outputs exist. The agent loop never sees memory directly. Every arrow on [the map](#dg-map-title) goes through a contract, which is why you can replace any box.

## Where your plugin sits

| You are building | You are called at step |
|---|---|
| An input | 1: you start the turn |
| Memory | 2, 3, 5 and 8 |
| An orchestrator | 4 |
| An agent loop | 6 |
| A capability (action) | 6, every time the model calls you |
| An output | 7 |
| Discovery, models, database, environment | whenever the parts above ask |
