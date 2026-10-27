# PLAIOS Package Manager

CLI and programmatic API for creating PLAIOS plugin packages.

## Run PLAIOS

```sh
pnpm plaios         # first run asks for the AI, channels and tools, writes plaios.yaml + .env, then starts
pnpm plaios init    # redo the setup
```

## Create a plugin

From the PLAIOS workspace root:

```sh
pnpm plaios create
pnpm plaios create input,output telegram --yes
pnpm plaios create --kind ai --kind memory --name assistant --yes
```

The built binary is named `plaios`, so an installed or published copy uses the
same command shape:

```sh
plaios create --kind action --name browser
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
`@plaios/microfrontend` and can be replaced with capability-specific UI.

Publishing is intentionally not implemented yet. It will be added as a separate
command once the registry backend exists.
