# PLAIOS Developer Guide

**Every part of PLAIOS is a plugin. Including the part you are about to write.**

The memory, the model, the router, the chat itself: each one is a package with a manifest, a class and a page. This package is the guide to building your own, shipped the PLAIOS way:

- **A page in Build**: the interactive map of how every component talks to the others, and a chapter for each of them, with real signatures, real manifests and working code.
- **A capability for the agent**: `read_developer_guide`, so you can ask the chat *"how do I write an input?"* and get the answer straight from the guide.

## What's inside

- **Start here**: why everything is a plugin, one message traced end to end, the anatomy of a package, your first plugin in five minutes.
- **The components**: inputs, outputs, capabilities, memory, orchestrators, the agent loop, discovery, System 1 and System 2, the database, the environment.
- **Superpowers**: what the host injects into your constructor, configuration and secrets, pages and the data bridge, chat components the model can draw, docs for the agent, publishing, and the sharp edges.

## Editing the guide

Chapters are plain markdown in `guide/NN-name.md`, with a small front matter block:

```markdown
---
id: input
part: The components
title: Inputs
tagline: Anything that can produce a sentence can talk to your agent.
kinds: input
---
```

`pnpm build` embeds them into the package. `kinds` links a chapter to its box on the map.
