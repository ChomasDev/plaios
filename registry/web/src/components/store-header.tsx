import { Boxes, Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface StoreHeaderProps {
  connected: boolean
  latencyMs?: number
}

export function StoreHeader({ connected, latencyMs }: StoreHeaderProps) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem("plaios-store-theme")
    const shouldUseDark =
      stored === "dark" ||
      (stored === null &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    document.documentElement.classList.toggle("dark", shouldUseDark)
    setDark(shouldUseDark)
  }, [])

  function toggleTheme() {
    const next = !dark
    document.documentElement.classList.toggle("dark", next)
    window.localStorage.setItem("plaios-store-theme", next ? "dark" : "light")
    setDark(next)
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <div className="flex size-8 items-center justify-center bg-primary text-primary-foreground">
            <Boxes className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-heading text-sm font-semibold tracking-tight">
              PLAIOS Store
            </p>
            <p className="hidden text-[10px] tracking-[0.16em] text-muted-foreground uppercase sm:block">
              Capability registry
            </p>
          </div>
        </Link>
        <Separator orientation="vertical" className="mx-1 h-5" />
        <Badge variant="outline" className="gap-1.5">
          <span
            className={`size-1.5 ${connected ? "bg-emerald-500" : "bg-destructive"}`}
          />
          {connected
            ? `Online${latencyMs ? ` · ${latencyMs}ms` : ""}`
            : "Offline"}
        </Badge>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={toggleTheme}
          >
            {dark ? <Sun /> : <Moon />}
          </Button>
        </div>
      </div>
    </header>
  )
}
