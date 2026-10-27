---
id: quickstart
part: Start here
title: Your first plugin in five minutes
tagline: From an empty folder to a tool the agent actually calls.
---
Let's build a real capability: the agent will be able to tell you the weather.

## 1. Scaffold it

From the repository root:

```bash terminal
agentos create action weather
```

You get `packages/weather` with a manifest, a class named `WeatherCapability`, a page and a stylesheet. Valid kinds are `input`, `output`, `action`, `agent`, `orchestrator`, `discovery`, `database`, `memory`, `system1`, `system2`, `env`. You can scaffold several at once: `agentos create --kind input,output telegram-clone`.

## 2. Give it a real job

```ts src/action.ts
import type {
  Capability, CapabilityExecutionContext, CapabilityManifest, CapabilityResult,
  Environment, UIComponentSpec,
} from "@agent-os/core/domain";

export interface WeatherInput { city: string; days: number | null }
export interface WeatherOutput { summary: string; days: Array<{ date: string; high: number; low: number }> }

const manifest: CapabilityManifest = {
  id: "weather.forecast",
  version: "1.0.0",
  name: "get_forecast",
  description: "Gets the weather forecast for a city. Use it whenever the user asks about weather, rain or temperature.",
  inputSchema: {
    type: "object",
    properties: {
      city: { type: "string", description: "City name, e.g. \"Treviso\"." },
      days: { type: ["number", "null"], description: "1 to 7, or null for 3." },
    },
    required: ["city", "days"],
    additionalProperties: false,
  },
  tags: ["weather", "forecast", "rain", "temperature", "meteo"],
};

export class WeatherCapability implements Capability<WeatherInput, WeatherOutput> {
  readonly manifest = manifest;
  private readonly apiKey: string;

  constructor(options: { env: Environment; apiKey?: string }) {
    this.apiKey = options.apiKey ?? options.env.getRequired("WEATHER_API_KEY");
  }

  uiComponents(): readonly UIComponentSpec[] { return []; }

  docs(): string {
    return "Use for any weather question. Pass the city as the user wrote it. Days default to 3.";
  }

  async execute(input: WeatherInput, context: CapabilityExecutionContext): Promise<CapabilityResult<WeatherOutput>> {
    if (!input.city?.trim()) return { success: false, error: { code: "VALIDATION_ERROR", message: "city is required", retryable: false } };
    const response = await fetch(`https://api.example.com/forecast?q=${encodeURIComponent(input.city)}&days=${input.days ?? 3}&key=${this.apiKey}`, { signal: context.signal });
    if (!response.ok) return { success: false, error: { code: "WEATHER_FAILED", message: `Provider said ${response.status}`, retryable: true } };
    const days = await response.json() as WeatherOutput["days"];
    return { success: true, data: { summary: `${days.length} days for ${input.city}`, days } };
  }
}
```

> **Tip** Make every property `required` and use `null` for "not given". The agent loop sends tools to the model in strict mode, and strict schemas cannot have optional keys.

## 3. Build and publish

```bash terminal
cd packages/weather
pnpm build
pnpm publish --registry http://<your-registry>:4873
```

## 4. Install it

Open **Store**, find `weather`, press **Install**. The host installs the package, checks that its microfrontend resolves, adds a component to `agent-os.yaml` with your config defaults, and reloads.

Set `WEATHER_API_KEY` in `.env` (or on the component page), and ask the chat: *"Will it rain in Treviso tomorrow?"*

That's it. No restart scripts, no code in the host, no prompt editing. The orchestrator finds you through your name, description and tags, and the agent loop calls you with typed arguments.
