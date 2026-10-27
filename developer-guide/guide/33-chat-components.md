---
id: chat-components
part: Superpowers
title: Chat components
tagline: Teach the model to draw. Live cards, inside its answers.
---
This is the part that feels like magic. Ask *"show me the garage cameras"* and three live camera cards appear in the answer. Ask for the news and a row of source cards slides in. The model did not output HTML. It wrote one line of a tiny language, and your plugin rendered it.

## Two halves, one name

**1. The capability declares the component** with `uiComponents()`. This is what the model learns:

```ts src/ui-components.ts
import type { UIComponentSpec } from "@plaios/core/domain";

export const WEB_SOURCES: UIComponentSpec = {
  name: "WebSources",
  description: "The sources of one web search as a row of cards. Use it right after search_web: WebSources(\"<id returned by search_web>\"). Never invent an id.",
  props: [{ name: "searchId", type: "string", description: "The id field search_web returned." }],
};
```

```ts src/index.ts
uiComponents(): readonly UIComponentSpec[] {
  return [WEB_SOURCES];
}
```

**2. The web entry exports a renderer** with the same name, in `openui`:

```tsx web/action/index.tsx
import type { OpenUIComponentModule } from "@plaios/microfrontend";
import { WEB_SOURCES } from "../../src/ui-components.js";
import { WebSources } from "./chat/web-sources.js";

export const openui: OpenUIComponentModule<SearchBridge, { searchId?: string }>[] = [
  { ...WEB_SOURCES, component: WebSources },
];
```

Keeping the spec in one React-free file, imported by both halves, means the model and the browser can never disagree about the name or the props.

## What the renderer receives

```ts @plaios/microfrontend
component: ComponentType<MicrofrontendProps<TData> & { args: TArgs; onOpen?(instanceId: string): void }>
```

- `args`: the props the model wrote, validated against your spec (`string`, `string[]`, `number`, `boolean`).
- `data`: your live bridge data, the same object your page gets. The camera cards poll `data.queries.snapshot(...)`. The source cards call `data.queries.search(id)`.
- `onOpen(instanceId)`: jump to your component page.

## Writing specs the model uses well

- **Describe when to use it, with an example call** in the description. `HomeCameras("garage")` teaches more than a paragraph.
- **Pass ids, not data.** `WebSources(searchId)` costs a handful of tokens, and the model cannot invent URLs. Store the data server-side (see [The database](#database)) and look it up in the renderer.
- **Say whether a tool call is needed first.** "It needs no tool call" lets the model answer instantly.

## The quieter sibling: `Chat`

Export a `Chat` component from your web entry, and when the agent uses your capability in a turn, the web chat shows it as a small card under the answer, with an *Open* link to your page. Cron uses it to show its schedule right where you asked about it.

> **Careful** Chat components only render in the web chat, and only for components that are enabled and have a data bridge (`microfrontendData`). Telegram and other text outputs never see them, so the answer text must stand on its own.
