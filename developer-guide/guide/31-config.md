---
id: config
part: Superpowers
title: Configuration and secrets
tagline: Declare a field once. Get a settings form, an env fallback and a default for free.
---
Every `config` entry in your manifest becomes three things at once: a field on your component page, a value in your constructor options, and a line in the docs the agent can read.

```yaml agent-os.package.yaml
    config:
      - key: baseUrl
        env: HOME_ASSISTANT_URL
        type: string
        required: true
        description: Home Assistant origin, e.g. http://homeassistant.local:8123
      - key: token
        env: HOME_ASSISTANT_TOKEN
        type: secret
        required: true
        description: Long-lived access token
      - key: timeoutMs
        type: number
        default: 10000
        description: Request timeout in milliseconds
```

## Field shape

| Property | Meaning |
|---|---|
| `key` | the option name your constructor receives |
| `type` | `string`, `number`, `boolean` or `secret` |
| `env` | environment variable to fall back on |
| `default` | used when nothing else is set; written into `plaios.yaml` on install |
| `required` | `true` means the component will not start without a value |
| `description` | shown under the field, and to the agent |

## How a value is resolved

For each field, in this order:

1. the value saved on the component page (in `plaios.yaml`)
2. the environment variable named by `env`, read through the environment component, then `process.env`
3. `default`
4. still empty and `required: true`: the component does not start, and Build shows *Missing required config "token" (HOME_ASSISTANT_TOKEN)*

Then `number` values go through `Number()` and `boolean` values accept `true`/`false`/`"1"`/`"0"`. Anything else is rejected.

## Secrets stay secret

- Put secrets in `.env` and reference them with `env:`. The page then shows `$HOME_ASSISTANT_TOKEN` instead of a value.
- `read_capability_docs` shows a `secret` field only as *set* or *not set*, never the value.
- Saving the page rewrites the whole config object and reloads the runtime, so your constructor always sees a consistent set.

> **Careful** A value typed on the page is stored as entered and overrides the coerced one. So a `number` saved as `"10"` reaches you as a string. Coerce defensively: `Math.trunc(Number(options.timeoutMs ?? 10_000))`.
