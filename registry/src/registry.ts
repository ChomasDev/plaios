const DEFAULT_REGISTRY_URL = "http://localhost:4873"
const DEFAULT_STORE_SCOPE = "@plaios/"

const capabilityNames = [
  "input",
  "output",
  "ai",
  "memory",
  "tool",
  "action",
  "database",
  "environment",
  "orchestrator",
  "artifact",
  "agent",
] as const

export type CapabilityKind = (typeof capabilityNames)[number]

export interface PackageSummary {
  name: string
  version: string
  description: string
  keywords: string[]
  capabilities: CapabilityKind[]
  category: "capability" | "foundation"
  publisher: string
  updatedAt: string | null
  versionCount: number
}

export interface PackageDetail extends PackageSummary {
  readme: string
  dependencies: Record<string, string>
  peerDependencies: Record<string, string>
  exports: string[]
  integrity: string | null
  tarball: string | null
  installCommand: string
}

interface SearchPackage {
  name?: unknown
}

interface SearchObject {
  package?: SearchPackage
}

interface SearchResponse {
  objects?: SearchObject[]
}

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {}
}

function asStringRecord(value: unknown): Record<string, string> {
  return Object.fromEntries(
    Object.entries(asRecord(value)).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  )
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

function registryUrl(): string {
  return (process.env.VERDACCIO_URL ?? DEFAULT_REGISTRY_URL).replace(/\/$/, "")
}

function storeScope(): string {
  return process.env.STORE_SCOPE ?? DEFAULT_STORE_SCOPE
}

function publicRegistryUrl(): string {
  return (process.env.PUBLIC_REGISTRY_URL ?? DEFAULT_REGISTRY_URL).replace(/\/$/, "")
}

function publicTarballUrl(value: unknown, baseUrl: string): string | null {
  if (typeof value !== "string") return null

  try {
    const url = new URL(value)
    return `${baseUrl}${url.pathname}`
  } catch {
    return null
  }
}

async function getJson(path: string): Promise<unknown> {
  const response = await fetch(`${registryUrl()}${path}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5_000),
  })

  if (!response.ok) {
    throw new Error(`Verdaccio returned ${response.status} for ${path}`)
  }

  return response.json()
}

export function inferCapabilities(keywords: string[]): CapabilityKind[] {
  const normalized = new Set(keywords.map((keyword) => keyword.toLowerCase()))
  return capabilityNames.filter((capability) => normalized.has(capability))
}

function packageExports(value: unknown): string[] {
  if (typeof value === "string") return ["."]
  return Object.keys(asRecord(value)).sort()
}

function latestVersion(document: UnknownRecord): string {
  const distTags = asRecord(document["dist-tags"])
  const taggedLatest = distTags["latest"]
  if (typeof taggedLatest === "string") return taggedLatest

  return Object.keys(asRecord(document["versions"])).at(-1) ?? "0.0.0"
}

export async function getPackage(
  name: string,
  requestedPublicRegistryUrl = publicRegistryUrl(),
): Promise<PackageDetail> {
  const document = asRecord(
    await getJson(`/${encodeURIComponent(name).replace("%40", "@")}`),
  )
  const version = latestVersion(document)
  const versions = asRecord(document["versions"])
  const manifest = asRecord(versions[version])
  const keywords = asStringArray(manifest["keywords"])
  const capabilities = inferCapabilities(keywords)
  const npmUser = asRecord(manifest["_npmUser"])
  const time = asRecord(document["time"])
  const dist = asRecord(manifest["dist"])

  return {
    name,
    version,
    description:
      typeof manifest["description"] === "string"
        ? manifest["description"]
        : "PLAIOS package",
    keywords,
    capabilities,
    category: capabilities.length > 0 ? "capability" : "foundation",
    publisher:
      typeof npmUser["name"] === "string" ? npmUser["name"] : "PLAIOS",
    updatedAt: typeof time[version] === "string" ? time[version] : null,
    versionCount: Object.keys(versions).length,
    readme: typeof document["readme"] === "string" ? document["readme"] : "",
    dependencies: asStringRecord(manifest["dependencies"]),
    peerDependencies: asStringRecord(manifest["peerDependencies"]),
    exports: packageExports(manifest["exports"]),
    integrity: typeof dist["integrity"] === "string" ? dist["integrity"] : null,
    tarball: publicTarballUrl(dist["tarball"], requestedPublicRegistryUrl),
    installCommand: `pnpm add ${name}@${version} --registry ${requestedPublicRegistryUrl}`,
  }
}

export async function listPackages(search = ""): Promise<PackageSummary[]> {
  const response = (await getJson(`/-/v1/search?text=${encodeURIComponent(storeScope().replace(/\/$/, ""))}&size=250`)) as SearchResponse
  const names = Array.from(
    new Set(
      (response.objects ?? [])
        .map((item) => item.package?.name)
        .filter((name): name is string =>
          typeof name === "string" && name.startsWith(storeScope()),
        ),
    ),
  )

  const packages = await Promise.all(names.map((name) => getPackage(name)))
  const normalizedSearch = search.trim().toLowerCase()

  return packages
    .filter((item) => {
      if (!normalizedSearch) return true
      return [item.name, item.description, ...item.keywords]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    })
    .map(({ readme: _readme, dependencies: _dependencies, peerDependencies: _peerDependencies, exports: _exports, integrity: _integrity, tarball: _tarball, installCommand: _installCommand, ...summary }) => summary)
    .sort((a, b) => {
      if (a.category !== b.category) return a.category === "capability" ? -1 : 1
      return a.name.localeCompare(b.name)
    })
}

export async function registryStatus() {
  const startedAt = performance.now()
  await getJson("/-/ping")

  return {
    connected: true as const,
    latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
    scope: storeScope().replace(/\/$/, ""),
  }
}
