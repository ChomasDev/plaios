#!/usr/bin/env node
import { parseArgs, styleText } from "node:util"

import { defaultHome, startRegistry } from "./server.js"

const { values } = parseArgs({
  options: {
    port: { type: "string", short: "p", default: "4873" },
    host: { type: "string", default: "127.0.0.1" },
    home: { type: "string", default: defaultHome() },
    help: { type: "boolean", short: "h" },
  },
})

if (values.help) {
  console.log(`PLAIOS local registry: Verdaccio plus the PLAIOS store UI on one port.

Usage: plaios-registry [options]
  -p, --port <port>   Port (default 4873)
      --host <host>   Interface to listen on (default 127.0.0.1; 0.0.0.0 shares it on your network)
      --home <dir>    Config and package storage (default ~/.plaios/registry)`)
  process.exit(0)
}

const registry = await startRegistry({ port: Number(values.port), host: values.host, home: values.home })
console.log(`
  ${styleText("green", "●")} ${styleText("bold", "PLAIOS registry is running")}

  ${styleText("cyan", "➜")}  Store     ${styleText(["cyan", "bold"], registry.url)}
  ${styleText("cyan", "➜")}  Registry  ${registry.url}  ${styleText("dim", "(npm, pnpm, plaios)")}
  ${styleText("dim", `   Publish   npm adduser --registry ${registry.url}, then npm publish --registry ${registry.url}`)}
  ${styleText("dim", `   Data      ${registry.home}`)}
`)

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => void registry.close().finally(() => process.exit(0)))
}
