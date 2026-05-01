import { describe, it, expect } from 'vitest'
import { nextId } from './ids'

describe('nextId', () => {
  it('returns prefix + 1 when no existing ids', () => {
    expect(nextId('z', [])).toBe('z1')
  })

  it('returns the next number after the highest existing id', () => {
    expect(nextId('z', ['z1', 'z2', 'z3'])).toBe('z4')
  })

  it('ignores ids with a different prefix', () => {
    expect(nextId('c', ['z1', 'z2', 'f1'])).toBe('c1')
  })

  it('handles gaps in numbering', () => {
    expect(nextId('f', ['f1', 'f5', 'f3'])).toBe('f6')
  })

  it('ignores ids that do not match the prefix+number pattern', () => {
    expect(nextId('c', ['c-abc', 'c-123-456', 'cx1'])).toBe('c1')
  })

  it('works with single-character and multi-digit numbers', () => {
    expect(nextId('t', ['t9', 't10', 't11'])).toBe('t12')
  })
})
