import type { PackageDetail as PackageDetailModel } from "@api"
import { ArrowUpRight, ExternalLink, PackageCheck } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Link } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { CopyCommand } from "@/components/copy-command"

export function PackageDetailSkeleton() {
  return (
    <Card className="min-h-[34rem] w-full min-w-0">
      <CardHeader className="gap-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-44 w-full" />
      </CardContent>
    </Card>
  )
}

export function PackageDetail({ item }: { item: PackageDetailModel }) {
  return (
    <Card className="min-h-[34rem] w-full min-w-0">
      <CardHeader className="border-b">
        <div className="mb-3 flex size-9 items-center justify-center bg-primary text-primary-foreground">
          <PackageCheck className="size-4" />
        </div>
        <CardTitle className="font-mono text-sm break-all">
          {item.name}
        </CardTitle>
        <CardDescription>{item.description}</CardDescription>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge>v{item.version}</Badge>
          {item.capabilities.map((capability) => (
            <Badge key={capability} variant="outline">
              {capability}
            </Badge>
          ))}
        </div>
        <Button
          className="mt-4 w-full"
          variant="outline"
          render={<Link to="/packages/$" params={{ _splat: item.name }} />}
        >
          More info <ArrowUpRight data-icon="inline-end" />
        </Button>
      </CardHeader>
      <CardContent className="min-w-0 space-y-5">
        <section className="space-y-2">
          <p className="text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Install from local registry
          </p>
          <CopyCommand command={item.installCommand} />
        </section>

        <div className="grid grid-cols-2 gap-px border bg-border">
          <DetailMetric label="Publisher" value={item.publisher} />
          <DetailMetric label="Versions" value={String(item.versionCount)} />
          <DetailMetric
            label="Dependencies"
            value={String(Object.keys(item.dependencies).length)}
          />
          <DetailMetric label="Exports" value={String(item.exports.length)} />
        </div>

        <Separator />

        <section>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
              README
            </p>
            {item.tarball ? (
              <Button
                size="xs"
                variant="ghost"
                render={
                  <a href={item.tarball} target="_blank" rel="noreferrer" />
                }
              >
                Tarball <ExternalLink data-icon="inline-end" />
              </Button>
            ) : null}
          </div>
          <article className="readme max-h-[32rem] overflow-y-auto pr-2 text-xs leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {item.readme || "No README was published for this package."}
            </ReactMarkdown>
          </article>
        </section>
      </CardContent>
    </Card>
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
