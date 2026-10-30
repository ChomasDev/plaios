import type { CapabilityKind } from "@api"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { ArrowUpRight, Boxes, Search, ShieldCheck, Sparkles } from "lucide-react"
import { useDeferredValue, useEffect, useMemo, useState } from "react"

import { PackageCard } from "@/components/package-card"
import {
  PackageDetail,
  PackageDetailSkeleton,
} from "@/components/package-detail"
import { StoreHeader } from "@/components/store-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { filterPackagesByCapability } from "@/lib/package-filter"
import { trpc } from "@/lib/trpc-client"

export const Route = createFileRoute("/")({ component: App })

function App() {
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [capability, setCapability] = useState<"all" | CapabilityKind>("all")
  const [selectedName, setSelectedName] = useState("@plaios/telegram")

  const statusQuery = useQuery({
    queryKey: ["registry-status"],
    queryFn: () => trpc.registry.status.query(),
    refetchInterval: 30_000,
  })
  const packagesQuery = useQuery({
    queryKey: ["packages", deferredSearch],
    queryFn: () => trpc.packages.list.query({ search: deferredSearch }),
  })
  const detailQuery = useQuery({
    queryKey: ["package", selectedName],
    queryFn: () => trpc.packages.byName.query({ name: selectedName }),
    enabled: selectedName.length > 0,
  })

  const visiblePackages = useMemo(() => {
    const packages = packagesQuery.data ?? []
    return filterPackagesByCapability(packages, capability)
  }, [capability, packagesQuery.data])

  useEffect(() => {
    if (visiblePackages.length === 0) return
    if (!visiblePackages.some((item) => item.name === selectedName)) {
      setSelectedName(visiblePackages[0]?.name ?? "")
    }
  }, [selectedName, visiblePackages])

  const packages = packagesQuery.data ?? []
  const capabilityCount = packages.filter((item) => item.category === "capability").length
  const versionCount = packages.reduce((total, item) => total + item.versionCount, 0)

  return (
    <div className="min-h-svh bg-background">
      <StoreHeader
        connected={statusQuery.data?.connected ?? false}
        latencyMs={statusQuery.data?.latencyMs}
      />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
        <section className="grid gap-10 border-b pb-12 lg:grid-cols-[1.5fr_1fr] lg:items-end">
          <div className="max-w-3xl">
            <Badge variant="outline" className="mb-5 gap-1.5">
              <Sparkles className="size-3" /> Local developer registry
            </Badge>
            <h1 className="font-heading text-4xl font-semibold tracking-[-0.04em] sm:text-5xl lg:text-6xl">
              Capabilities that snap into your agent runtime.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Discover versioned inputs, outputs, models, memory, and tools. Every
              package ships its runtime contract and its own management surface.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <Button onClick={() => document.querySelector<HTMLInputElement>("#package-search")?.focus()}>
                Explore packages <ArrowUpRight data-icon="inline-end" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-px border bg-border">
            <HeroMetric label="Packages" value={String(packages.length)} icon={<Boxes />} />
            <HeroMetric label="Capabilities" value={String(capabilityCount)} icon={<Sparkles />} />
            <HeroMetric label="Versions" value={String(versionCount)} icon={<ShieldCheck />} />
          </div>
        </section>

        <section className="pt-10">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Registry index
              </p>
              <h2 className="mt-1 font-heading text-xl font-semibold tracking-tight">
                Available packages
              </h2>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-64">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="package-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search package, keyword, capability…"
                  className="pl-8"
                />
              </div>
              <Tabs value={capability} onValueChange={(value) => setCapability(value as "all" | CapabilityKind)}>
                <TabsList className="overflow-x-auto">
                  {(["all", "input", "output", "ai", "memory", "action"] as const).map((item) => (
                    <TabsTrigger key={item} value={item} className="capitalize">
                      {item}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>

          {packagesQuery.isError ? (
            <Card className="mt-6 border-destructive/30 bg-destructive/5">
              <CardContent>
                <p className="font-medium text-destructive">The store API is unavailable.</p>
                <p className="mt-1 text-muted-foreground">
                  Start the Compose stack and retry the request.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
              <div className="min-w-0">
                {packagesQuery.isLoading ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-44 w-full" />
                    ))}
                  </div>
                ) : visiblePackages.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {visiblePackages.map((item) => (
                      <PackageCard
                        key={item.name}
                        item={item}
                        selected={selectedName === item.name}
                        onSelect={() => setSelectedName(item.name)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-44 items-center justify-center border border-dashed text-center">
                    <div>
                      <p className="font-medium">No packages found</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Try another search or capability filter.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
                {detailQuery.data ? (
                  <PackageDetail item={detailQuery.data} />
                ) : (
                  <PackageDetailSkeleton />
                )}
              </aside>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>PLAIOS plugin registry</span>
          <span>TanStack · tRPC · Express · Verdaccio</span>
        </div>
      </footer>
    </div>
  )
}

function HeroMetric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-background p-4">
      <div className="mb-6 text-muted-foreground [&_svg]:size-3.5">{icon}</div>
      <p className="font-mono text-2xl font-medium tracking-tight">{value.padStart(2, "0")}</p>
      <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    </div>
  )
}
