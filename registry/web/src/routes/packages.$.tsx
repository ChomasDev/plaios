import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import {
  PackagePage,
  PackagePageMissing,
  PackagePageSkeleton,
} from "@/components/package-page"
import { StoreHeader } from "@/components/store-header"
import { parsePackageName } from "@/lib/package-name"
import { trpc } from "@/lib/trpc-client"

export const Route = createFileRoute("/packages/$")({
  component: PackageInfoPage,
})

function PackageInfoPage() {
  const { _splat: splat } = Route.useParams()
  const name = parsePackageName(splat)

  const statusQuery = useQuery({
    queryKey: ["registry-status"],
    queryFn: () => trpc.registry.status.query(),
    refetchInterval: 30_000,
  })
  const detailQuery = useQuery({
    queryKey: ["package", name],
    queryFn: () => trpc.packages.byName.query({ name: name! }),
    enabled: name !== null,
  })

  return (
    <div className="min-h-svh bg-background">
      <StoreHeader
        connected={statusQuery.data?.connected ?? false}
        latencyMs={statusQuery.data?.latencyMs}
      />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
        {name === null ? (
          <PackagePageMissing name={splat} />
        ) : detailQuery.isError ? (
          <PackagePageMissing name={name} />
        ) : detailQuery.data ? (
          <PackagePage item={detailQuery.data} />
        ) : (
          <PackagePageSkeleton />
        )}
      </main>
    </div>
  )
}
