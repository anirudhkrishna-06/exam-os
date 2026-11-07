export function normalizeUserSearchQuery(value: string): string {
  return value.trim().replace(/[\\%_]/g, (character) => `\\${character}`)
}

export function isValidUserSearchQuery(value: string): boolean {
  return value.trim().length >= 3
}
