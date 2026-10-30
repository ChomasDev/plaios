import { describe, expect, it } from "vitest"

import { inferCapabilities } from "../src/registry.js"

describe("inferCapabilities", () => {
  it("extracts supported capability kinds and ignores store metadata", () => {
    expect(
      inferCapabilities(["plaios", "capability", "Telegram", "input", "output"]),
    ).toEqual(["input", "output"])
  })

  it("keeps the canonical capability order", () => {
    expect(inferCapabilities(["memory", "ai", "tool"])).toEqual([
      "ai",
      "memory",
      "tool",
    ])
  })
})
