import type { PackageDetail as PackageDetailModel } from "@api"
import { ArrowLeft, ExternalLink, PackageCheck } from "lucide-react"
import type { ReactNode } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Link } from "@tanstack/react-router"

import { CopyCommand } from "@/components/copy-command"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

export function PackagePageSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(20rem,0.8fr)]">
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-128 w-full" />
      </div>
      <Skeleton className="h-112 w-full" />
    </div>
  )
}

export function PackagePageMissing({ name }: { name?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Package not found</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          {name
            ? `${name} is not in the local PLAIOS registry.`
            : "This package could not be loaded from the registry."}
        </p>
        <Button variant="outline" render={<Link to="/" />}>
          <ArrowLeft data-icon="inline-start" /> Back to registry
        </Button>
      </CardContent>
    </Card>
  )
}

export function PackagePage({ item }: { item: PackageDetailModel }) {
  const dependencyEntries = Object.entries(item.dependencies)
  const peerEntries = Object.entries(item.peerDependencies)

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(20rem,0.8fr)] lg:items-start">
      <div className="min-w-0">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2"
          render={<Link to="/" />}
        >
          <ArrowLeft data-icon="inline-start" /> Back to registry
        </Button>

        <div className="mb-4 flex size-10 items-center justify-center bg-primary text-primary-foreground">
          <PackageCheck className="size-5" />
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-[-0.04em] break-all sm:text-4xl">
          {item.name}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          {item.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          <Badge>v{item.version}</Badge>
          <Badge variant="secondary">{item.category}</Badge>
          {item.capabilities.map((capability) => (
            <Badge key={capability} variant="outline">
              {capability}
            </Badge>
          ))}
        </div>

        <Separator className="my-8" />

        <section>
          <p className="mb-4 text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            README
          </p>
          <article className="readme text-sm leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {item.readme || "No README was published for this package."}
            </ReactMarkdown>
          </article>
        </section>
      </div>

      <aside className="min-w-0 space-y-4 lg:sticky lg:top-20">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Install</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CopyCommand command={item.installCommand} />
            {item.tarball ? (
              <Button
                variant="outline"
                className="w-full"
                render={
                  <a href={item.tarball} target="_blank" rel="noreferrer" />
                }
              >
                Download tarball <ExternalLink data-icon="inline-end" />
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-2 gap-px bg-border">
              <DetailMetric label="Publisher" value={item.publisher} />
              <DetailMetric
                label="Versions"
                value={String(item.versionCount)}
              />
              <DetailMetric
                label="Updated"
                value={formatUpdatedAt(item.updatedAt)}
              />
              <DetailMetric
                label="Exports"
                value={String(item.exports.length)}
              />
            </div>
          </CardContent>
        </Card>

        <InfoList title="Keywords" empty="No keywords published.">
          {item.keywords.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {item.keywords.map((keyword) => (
                <Badge key={keyword} variant="outline">
                  {keyword}
                </Badge>
              ))}
            </div>
          ) : null}
        </InfoList>

        <InfoList title="Dependencies" empty="No runtime dependencies.">
          {dependencyEntries.length > 0 ? (
            <CodeList entries={dependencyEntries} />
          ) : null}
        </InfoList>

        <InfoList title="Peer dependencies" empty="No peer dependencies.">
          {peerEntries.length > 0 ? <CodeList entries={peerEntries} /> : null}
        </InfoList>

        <InfoList title="Exports" empty="No exports published.">
          {item.exports.length > 0 ? (
            <ul className="space-y-1 font-mono text-[11px]">
              {item.exports.map((entry) => (
                <li key={entry} className="truncate text-muted-foreground">
                  {entry}
                </li>
              ))}
            </ul>
          ) : null}
        </InfoList>

        {item.integrity ? (
          <InfoList title="Integrity">
            <p className="font-mono text-[11px] break-all text-muted-foreground">
              {item.integrity}
            </p>
          </InfoList>
        ) : null}
      </aside>
    </div>
  )
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card p-3">
      <p className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 truncate font-mono text-xs font-medium">{value}</p>
    </div>
  )
}

function InfoList({
  title,
  empty,
  children,
}: {
  title: string
  empty?: string
  children: ReactNode
}) {
  const isEmpty = children == null

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? <p className="text-muted-foreground">{empty}</p> : children}
      </CardContent>
    </Card>
  )
}

function CodeList({ entries }: { entries: [string, string][] }) {
  return (
    <ul className="space-y-1.5">
      {entries.map(([name, version]) => (
        <li
          key={name}
          className="flex min-w-0 items-baseline justify-between gap-3"
        >
          <span className="truncate font-mono text-[11px]">{name}</span>
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
            {version}
          </span>
        </li>
      ))}
    </ul>
  )
}

function formatUpdatedAt(value: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
