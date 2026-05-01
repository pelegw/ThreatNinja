export const nextId = (prefix: string, existingIds: readonly string[]): string => {
  const pattern = new RegExp(`^${prefix}(\\d+)$`)
  const max = existingIds.reduce((highest, id) => {
    const match = pattern.exec(id)
    return match !== null ? Math.max(highest, Number(match[1])) : highest
  }, 0)
  return `${prefix}${max + 1}`
}
