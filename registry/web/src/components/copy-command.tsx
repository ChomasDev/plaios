import { Check, Copy } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"

export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(command)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1_500)
  }

  return (
    <div className="flex min-w-0 items-center border bg-muted/35">
      <code className="min-w-0 flex-1 overflow-x-auto px-3 py-2 font-mono text-[11px] whitespace-nowrap">
        {command}
      </code>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 border-l"
        aria-label="Copy install command"
        onClick={copy}
      >
        {copied ? <Check className="text-emerald-500" /> : <Copy />}
      </Button>
    </div>
  )
}
