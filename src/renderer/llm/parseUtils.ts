export const extractJsonObjects = (text: string): [objects: string[], remaining: string] => {
  const objects: string[] = []
  let depth = 0
  let start = -1
  let inString = false
  let escaped = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (escaped) { escaped = false; continue }
    if (ch === '\\' && inString) { escaped = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') { if (depth === 0) start = i; depth++ }
    else if (ch === '}') {
      depth--
      if (depth === 0 && start !== -1) {
        objects.push(text.slice(start, i + 1))
        start = -1
      }
    }
  }

  const remaining = depth > 0 && start !== -1 ? text.slice(start) : ''
  return [objects, remaining]
}
