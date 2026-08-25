# Agent OS Microfrontend

Shared React contracts, configuration UI, theme tokens, and shadcn-style
components for capability-owned Agent OS screens.

Each plugin exports a separate microfrontend for every interface it implements.
The host imports `@agent-os/microfrontend/styles.css` once and mounts the entry
declared by the interface's `web` manifest field.
