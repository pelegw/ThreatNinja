import { describe, it, expect } from 'vitest'
import { layoutOptions } from './layout'

describe('layoutOptions', () => {
  it('uses cose-bilkent for compound graph support', () => {
    expect(layoutOptions().name).toBe('cose-bilkent')
  })

  it('returns an options object (not null or undefined)', () => {
    expect(layoutOptions()).toBeDefined()
  })
})
