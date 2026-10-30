export const PACKAGE_NAME_PATTERN = /^@[a-z0-9-]+\/[a-z0-9-]+$/

export function parsePackageName(value: string | undefined): string | null {
  if (!value) return null

  try {
    const decoded = decodeURIComponent(value)
    return PACKAGE_NAME_PATTERN.test(decoded) ? decoded : null
  } catch {
    return null
  }
}
