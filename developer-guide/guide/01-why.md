---
id: why
part: Start here
title: Plugins all the way down
tagline: There is no core you are not allowed to replace.
---
Most agent frameworks give you a brain and let you bolt tools onto it.

Agent OS does the opposite.

**There is no brain.** There is a host that loads packages, hands each one the others it asked for, and gets out of the way. The model is a package. The memory is a package. The thing that decides which tools to use is a package. Even the chat you are reading this in sits on the same contracts you are about to use.

That changes what "writing a plugin" means.

You are not writing an extension to someone else's agent. You are writing **a part of the operating system**, on equal footing with every part that shipped with it.

## Three ideas that make it work

- **Contracts, not conventions.** Every kind of component is a TypeScript interface in `@agent-os/core/domain`. If your class satisfies it, the host can run it. No base classes, no decorators, no registration calls.
- **Wiring is declared, not coded.** Your `agent-os.package.yaml` says what you are (`kind: input`) and what you need (`required: [system2]`). The host builds your constructor options from that. You never import another plugin.
- **Every part has a face.** Each interface ships a page microfrontend, and capabilities can teach the model to draw live components right inside its answers.

## What you will be able to do by the end

- Bring messages in from anywhere: a webhook, a mailbox, a sensor, a cron line.
- Give the agent a new power, with typed inputs it cannot get wrong.
- Store your own tables in a database the host scoped just for you.
- Show a page in Build, and cards the model can place in the chat.
- Swap the memory, the router or the model for your own.
- Publish it, and install it from the Store with one click.

> **Tip** Every signature in this guide is copied from the real source. When the guide and the code disagree, the code wins, and the guide has a bug worth reporting.

Start with [One message, start to finish](#journey). It is the map everything else hangs on.
