---
id: ai-docs
part: Superpowers
title: Docs for the agent
tagline: Write the manual once. The agent reads it exactly when it needs to.
---
Your `description` gets you chosen. Your `docs()` gets you used **well**.

Every agent loop has `read_capability_docs` (id `agent-os.docs`) loaded on every turn. When the model is unsure about your capability, or a call just failed, it reads your manual instead of guessing.

## What the agent gets

`read_capability_docs({ capabilityId: "web.search" })` returns markdown assembled by the host, in this order:

1. `# search_web (web.search)` and your description
2. **your `docs()`**
3. your input schema
4. your `examples`
5. your configuration, with current values, and secrets shown only as *set* or *not set*
6. your chat components, as `Name(prop?: type)` signatures

So **do not repeat** the schema, the config or the components in `docs()`. Spend the words on what only you know.

## A great `docs()` has four parts

```ts src/index.ts
docs(): string {
  return `Searches the live web and returns ranked sources.

**Use it** for anything that may have changed recently: news, prices, releases.
**Don't use it** for things memory or another capability already knows.

**Inputs**
- query: write it like a search: {"query":"Node.js 26 release date"}
- searchRecencyFilter for fresh topics: {"query":"Serie A results","searchRecencyFilter":"day"}

**Limits**: 30 s timeout. WEB_SEARCH_FAILED is retryable once.`;
}
```

1. **When to use it, and when not**, naming the sibling to use instead.
2. **How the inputs really behave**, with one to three example calls as JSON.
3. **What to do after**: which chat component to show, what to tell the user.
4. **Limits and failure codes**, and which ones are worth a retry.

> **Tip** Write it for a smart colleague on their first day, not for a search engine. Short sentences, concrete examples, no marketing.
