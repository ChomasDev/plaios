---
id: sharp-edges
part: Superpowers
title: Sharp edges, honestly
tagline: Everything the code does that you might not expect. Read it once, save a day.
---
Every system has corners. Here are ours, straight from the source, so none of them surprises you in production.

- **`initialize()` is never called.** It is in the `Capability` type, but the host does not call it. Set up lazily on first use.
- **Only `startup.when: manual` does anything.** It keeps an interface out of a Store install. `always` and `ifConfigured` behave the same today.
- **`surfaces`, `permissions` and a yaml `capability:` block are ignored.** The capability manifest that counts is the one on your class.
- **Values typed on the page beat coercion.** A `number` saved as `"10"` arrives as a string. Coerce in your constructor.
- **A reload rebuilds everything.** Saving any config, installing, toggling: every component gets `close()` (or `stop()`) and is constructed again. Keep no state you cannot rebuild, and release every port and timer in `close`/`stop`.
- **Shared instances keep the first options.** Interfaces sharing a `className` share one object, constructed with the first interface's options.
- **One memory, one orchestrator, one agent loop.** Only the first of each is used. A second one is silently ignored.
- **`outputChannel` must exist.** An orchestrator naming a missing output fails the whole turn.
- **Bridge data must be plain.** Class instances and cycles in `microfrontendData()` turn into `undefined` on the way to the browser.
- **Chat components need a data bridge.** No `microfrontendData()`, no chat components, even if `uiComponents()` returns some.
- **Strict schemas.** Tool schemas go to the model in strict mode: list every property in `required` and use `null` for "not given".

> **Tip** Found an edge that is not here? It is a bug in the guide or in the host. Both are worth a pull request.
