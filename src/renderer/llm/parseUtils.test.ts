import { describe, it, expect } from 'vitest'
import { extractJsonObjects } from './parseUtils'

describe('extractJsonObjects', () => {
  it('extracts a single compact object', () => {
    const [objects] = extractJsonObjects('{"a":1}')
    expect(objects).toEqual(['{"a":1}'])
  })

  it('extracts multiple compact objects separated by newlines', () => {
    const [objects] = extractJsonObjects('{"a":1}\n{"b":2}')
    expect(objects).toEqual(['{"a":1}', '{"b":2}'])
  })

  it('extracts a pretty-printed multi-line object', () => {
    const input = '{\n  "a": 1,\n  "b": 2\n}'
    const [objects] = extractJsonObjects(input)
    expect(objects).toHaveLength(1)
    expect(JSON.parse(objects[0]!)).toEqual({ a: 1, b: 2 })
  })

  it('extracts multiple pretty-printed objects separated by blank lines', () => {
    const input = '{\n  "a": 1\n}\n\n{\n  "b": 2\n}'
    const [objects] = extractJsonObjects(input)
    expect(objects).toHaveLength(2)
  })

  it('ignores braces inside string values', () => {
    const input = '{"desc": "uses {inject} payload"}'
    const [objects] = extractJsonObjects(input)
    expect(objects).toHaveLength(1)
    expect(JSON.parse(objects[0]!).desc).toBe('uses {inject} payload')
  })

  it('ignores escaped quotes inside strings', () => {
    const input = '{"msg": "say \\"hello\\""}'
    const [objects] = extractJsonObjects(input)
    expect(objects).toHaveLength(1)
  })

  it('returns remaining incomplete object as the second element', () => {
    const input = '{"a":1}\n{"b":'
    const [objects, remaining] = extractJsonObjects(input)
    expect(objects).toEqual(['{"a":1}'])
    expect(remaining).toBe('{"b":')
  })

  it('returns empty remaining when all objects are complete', () => {
    const [, remaining] = extractJsonObjects('{"a":1}')
    expect(remaining).toBe('')
  })

  it('returns empty objects array and empty remaining for text with no braces', () => {
    const [objects, remaining] = extractJsonObjects('no braces here')
    expect(objects).toEqual([])
    expect(remaining).toBe('')
  })

  it('handles nested objects', () => {
    const input = '{"outer":{"inner":1}}'
    const [objects] = extractJsonObjects(input)
    expect(objects).toHaveLength(1)
    expect(JSON.parse(objects[0]!)).toEqual({ outer: { inner: 1 } })
  })
})
