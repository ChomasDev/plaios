import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { createServer, type IncomingMessage, type RequestListener, type Server } from "node:http"
import { homedir } from "node:os"
import { extname, join, normalize } from "node:path"
import { fileURLToPath } from "node:url"
import { createHTTPHandler } from "@trpc/server/adapters/standalone"
import { runServer } from "verdaccio"

import { appRouter } from "./trpc.js"

export interface RegistryOptions {
  port?: number
  host?: string
  /** Holds config.yaml, the package storage and htpasswd. */
  home?: string
}

export interface RegistryHandle {
  url: string
  home: string
  close(): Promise<void>
}

const STORE = "/-/store"
const WEB_ROOT = fileURLToPath(new URL("../web/", import.meta.url))
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
}

// Reads are open to everyone and publishing needs an account (npm adduser), like the Docker store.
const CONFIG = `storage: ./storage
auth:
  htpasswd:
    file: ./htpasswd
    max_users: 1000
uplinks:
  npmjs:
    url: https://registry.npmjs.org/
packages:
  "@*/*":
    access: $all
    publish: $authenticated
    unpublish: $authenticated
    proxy: npmjs
  "**":
    access: $all
    publish: $authenticated
    unpublish: $authenticated
    proxy: npmjs
web:
  enable: false
server:
  keepAliveTimeout: 60
max_body_size: 50mb
log:
  type: stdout
  format: pretty
  level: warn
`

export const defaultHome = () => process.env.PLAIOS_REGISTRY_HOME ?? join(homedir(), ".plaios", "registry")

async function serveFile(path: string, response: Parameters<RequestListener>[1]): Promise<boolean> {
  const file = normalize(join(WEB_ROOT, path))
  if (!file.startsWith(WEB_ROOT) || !existsSync(file) || file.endsWith("/")) return false
  response.writeHead(200, {
    "content-type": MIME[extname(file)] ?? "application/octet-stream",
    "cache-control": path.includes("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
  })
  response.end(await readFile(file))
  return true
}

/** Browser page loads; npm and pnpm never ask for HTML. */
const wantsPage = (request: IncomingMessage, path: string) =>
  request.method === "GET" && (request.headers.accept ?? "").includes("text/html") && (path === "/" || path.startsWith("/packages/"))

/** Starts Verdaccio and the PLAIOS store UI on one port: npm traffic goes to Verdaccio, pages and /-/store to the store. */
export async function startRegistry(options: RegistryOptions = {}): Promise<RegistryHandle> {
  const port = options.port ?? 4873
  const host = options.host ?? "127.0.0.1"
  const home = options.home ?? defaultHome()
  const configPath = join(home, "config.yaml")
  await mkdir(home, { recursive: true })
  if (!existsSync(configPath)) await writeFile(configPath, CONFIG)

  // The store API reads package metadata back through this same server.
  process.env.VERDACCIO_URL = `http://127.0.0.1:${port}`
  const verdaccioServer: Server = await runServer(configPath)
  const verdaccio = verdaccioServer.listeners("request")[0] as RequestListener
  const api = createHTTPHandler({
    router: appRouter,
    basePath: `${STORE}/trpc/`,
    createContext: ({ req }) => ({ publicRegistryUrl: `http://${req.headers.host ?? `localhost:${port}`}` }),
  })

  const server = createServer(async (request, response) => {
    const path = decodeURIComponent(new URL(request.url ?? "/", "http://registry").pathname)
    try {
      if (path.startsWith(`${STORE}/trpc/`)) return api(request, response)
      if (path.startsWith(`${STORE}/`) && (await serveFile(path.slice(STORE.length), response))) return
      if (wantsPage(request, path) && (await serveFile("index.html", response))) return
      // A stale token in someone's ~/.npmrc makes Verdaccio refuse even public reads with 401; reads need no auth here.
      if ((request.method === "GET" || request.method === "HEAD") && !path.startsWith("/-/")) delete request.headers.authorization
      verdaccio(request, response)
    } catch (error) {
      response.writeHead(500, { "content-type": "text/plain" })
      response.end(error instanceof Error ? error.message : String(error))
    }
  })
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(port, host, resolve)
  })

  return {
    url: `http://${host === "0.0.0.0" || host === "127.0.0.1" ? "localhost" : host}:${port}`,
    home,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  }
}
