---
id: pages
part: Superpowers
title: Your page and the data bridge
tagline: A React page in Build that can call your class like a local object.
---
Every interface has a page. It is required: the Store refuses to install a package whose page cannot be found, and Build flags one that goes missing. The good news is that the page can do almost anything, because of the **data bridge**.

## The page

The default export of your web entry (`./web/<kind>` by default) is a React component:

```ts @agent-os/microfrontend
export interface MicrofrontendProps<TData = unknown> {
  component: ComponentInstance;   // instanceId, kind, id, version, config, fields
  data?: TData;                   // whatever your class's microfrontendData() returned
  onSaveConfig?: (config: Record<string, unknown>) => void | Promise<void>;
}
```

`@agent-os/microfrontend` gives you the building blocks the shipped plugins use: `MicrofrontendFrame`, `ConfigurationEditor`, `InstanceSummary`, `Card`, `Badge`, `Button`, `Input`, `Label`, `Textarea`, and `cn`. The two-line page is a real, useful page:

```tsx web/action/index.tsx
import { CapabilityMicrofrontend, type MicrofrontendProps } from "@agent-os/microfrontend";

export default function WeatherPage(props: MicrofrontendProps) {
  return <CapabilityMicrofrontend {...props} />;   // config form + instance summary
}
```

## The data bridge

Give your class a `microfrontendData()` method, and whatever it returns arrives as `data` in your page. **Functions inside it become callable from the browser.**

```ts src/action.ts
microfrontendData() {
  return {
    connected: this.connected,
    devices: this.devices,                    // plain data, serialized as JSON
    queries: {
      snapshot: (entityId: string) => this.cameraSnapshot(entityId),   // read-only
    },
    actions: {
      control: async (input: ControlInput) => { await this.control(input); return this.dashboard(); },
    },
  };
}
```

```tsx web/action/index.tsx
export default function HomePage({ data }: MicrofrontendProps<HomeData>) {
  return <button onClick={() => data?.actions.control({ entityId: "light.desk", action: "toggle" })}>Toggle</button>;
}
```

What happens under the hood:

- Each function is replaced by a marker with its path (`actions.control`). In the browser, the marker becomes an `async` function that posts `{ path, args }` to `/api/components/<instanceId>/action`.
- **After an action, the page data is refetched.** Calls under `queries.` skip the refetch, which is what you want for polling.
- Dates become ISO strings, bigint becomes a string, `Uint8Array` becomes `{ type: "bytes", byteLength }`. Class instances and cycles become `undefined`, so return plain objects.

## Saving settings

Call `onSaveConfig(config)` with the **whole** config object. The host writes `agent-os.yaml`, reloads the runtime, and your page re-renders with the new values. `ConfigurationEditor` does all of this for you.

## Styling

`web/styles.css` is loaded once, next to your page:

```css web/styles.css
@import "@agent-os/microfrontend/styles.css";
@source ".";
```

That import gives you Tailwind with the host's theme tokens (`bg-background`, `text-muted-foreground`, `border`, `primary`...), so your page follows light and dark mode with no work. Prefix your own classes (`ha-`, `cron-`, `ws-`) so you never collide with another plugin.

> **Tip** The page is not required to use `MicrofrontendFrame`. This guide does not: it is its own layout, inside the same contract.
