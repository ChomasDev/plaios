# Agent OS Package Manager

CLI and programmatic API for creating Agent OS plugin packages.

## Create a plugin

From the Agent OS workspace root:

```sh
pnpm agentos create
pnpm agentos create input,output telegram --yes
pnpm agentos create --kind ai --kind memory --name assistant --yes
```

The built binary is named `agentos`, so an installed or published copy uses the
same command shape:

```sh
agentos create --kind action --name browser
```

Supported plugin kinds are `input`, `output`, `action`, `agent`, `orchestrator`,
`discovery`, `database`, `memory`, `ai`, and `env`.

A plugin may implement any combination of these interfaces. The creator writes
one module per interface, exports them from `src/index.ts`, and registers all of
them in the plugin's `agent-os.package.yaml` manifest.

Each selected interface also receives its own React microfrontend entry:

```text
packages/example/
├── src/
│   ├── input.ts
│   └── output.ts
└── web/
    ├── input/index.tsx
    ├── output/index.tsx
    └── styles.css
```

The generated screen uses the shared shadcn/Tailwind configuration editor from
`@agent-os/microfrontend` and can be replaced with capability-specific UI.

Publishing is intentionally not implemented yet. It will be added as a separate
command once the registry backend exists.
