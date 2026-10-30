import { describe, expect, it } from "vitest"

import { parsePackageName } from "./package-name"

describe("parsePackageName", () => {
  it("accepts scoped PLAIOS package names", () => {
    expect(parsePackageName("@plaios/telegram")).toBe("@plaios/telegram")
  })

  it("decodes percent-encoded names from the URL", () => {
    expect(parsePackageName("%40plaios%2Ftelegram")).toBe(
      "@plaios/telegram"
    )
  })

  it("rejects missing or invalid values", () => {
    expect(parsePackageName(undefined)).toBeNull()
    expect(parsePackageName("telegram")).toBeNull()
    expect(parsePackageName("@plaios/not valid")).toBeNull()
  })
})
