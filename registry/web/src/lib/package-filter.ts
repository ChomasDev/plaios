import type { CapabilityKind, PackageSummary } from "@api"

export function filterPackagesByCapability(
  packages: PackageSummary[],
  capability: "all" | CapabilityKind,
): PackageSummary[] {
  if (capability === "all") return packages
  return packages.filter((item) => item.capabilities.includes(capability))
}
