import type { PackageSummary } from "@api"
import { Bot, Box, Brain, Database, LogIn, Send, Wrench } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

function PackageIcon({ item }: { item: PackageSummary }) {
  const className = "size-4"
  if (item.capabilities.includes("input")) return <LogIn className={className} />
  if (item.capabilities.includes("output")) return <Send className={className} />
  if (item.capabilities.includes("ai")) return <Bot className={className} />
  if (item.capabilities.includes("memory")) return <Brain className={className} />
  if (item.capabilities.includes("database")) return <Database className={className} />
  if (item.capabilities.includes("tool") || item.capabilities.includes("action")) return <Wrench className={className} />
  return <Box className={className} />
}

interface PackageCardProps {
  item: PackageSummary
  selected: boolean
  onSelect: () => void
}

export function PackageCard({ item, selected, onSelect }: PackageCardProps) {
  return (
    <button type="button" className="min-w-0 w-full text-left" onClick={onSelect}>
      <Card
        className={cn(
          "min-h-44 min-w-0 w-full transition-colors hover:bg-muted/30",
          selected && "bg-muted/45 ring-foreground/35",
        )}
      >
        <CardHeader>
          <div className="mb-3 flex size-8 items-center justify-center border bg-background">
            <PackageIcon item={item} />
          </div>
          <CardTitle className="min-w-0 truncate font-mono text-xs">{item.name}</CardTitle>
          <CardDescription className="line-clamp-2 min-h-9">
            {item.description}
          </CardDescription>
          <CardAction>
            <Badge variant={item.category === "capability" ? "default" : "secondary"}>
              {item.category}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="mt-auto flex flex-wrap items-center gap-1.5">
          {item.capabilities.map((capability) => (
            <Badge key={capability} variant="outline">
              {capability}
            </Badge>
          ))}
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">
            v{item.version}
          </span>
        </CardContent>
      </Card>
    </button>
  )
}
