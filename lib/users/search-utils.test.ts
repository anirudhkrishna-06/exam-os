import { describe, expect, it } from 'vitest'
import { isValidUserSearchQuery, normalizeUserSearchQuery } from './search-utils'

describe('user search helpers', () => {
  it('requires at least three characters', () => {
    expect(isValidUserSearchQuery('ab')).toBe(false)
    expect(isValidUserSearchQuery(' abc ')).toBe(true)
  })

  it('escapes SQL LIKE wildcard characters', () => {
    expect(normalizeUserSearchQuery('a%_\\b')).toBe('a\\%\\_\\\\b')
  })
})
