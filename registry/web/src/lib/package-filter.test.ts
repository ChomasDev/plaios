import type { PackageSummary } from "@api"
import { describe, expect, it } from "vitest"

import { filterPackagesByCapability } from "./package-filter"

const packages: PackageSummary[] = [
  {
    name: "@plaios/telegram",
    version: "0.1.0",
    description: "Telegram capability",
    keywords: ["input", "output"],
    capabilities: ["input", "output"],
    category: "capability",
    publisher: "chomas",
    updatedAt: null,
    versionCount: 1,
  },
  {
    name: "@plaios/core",
    version: "0.1.0",
    description: "Core contracts",
    keywords: [],
    capabilities: [],
    category: "foundation",
    publisher: "chomas",
    updatedAt: null,
    versionCount: 1,
  },
]

describe("filterPackagesByCapability", () => {
  it("returns the complete registry for the all tab", () => {
    expect(filterPackagesByCapability(packages, "all")).toHaveLength(2)
  })

  it("keeps only packages implementing a selected capability", () => {
    expect(filterPackagesByCapability(packages, "output").map((item) => item.name)).toEqual([
      "@plaios/telegram",
    ])
  })
})
