import { describe, expect, it } from 'vitest'
import { hasValidMediaSignature, safeMediaFilename } from './validation'

describe('media validation', () => {
  it('normalizes filenames into safe object-key segments', () => {
    expect(safeMediaFilename('../diagram final?.png')).toBe('..-diagram-final-.png')
    expect(safeMediaFilename('')).toBe('upload')
  })

  it('checks signatures instead of trusting MIME types', () => {
    expect(hasValidMediaSignature('image/png', new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(true)
    expect(hasValidMediaSignature('image/png', new Uint8Array([0xff, 0xd8, 0xff]))).toBe(false)
    expect(hasValidMediaSignature('application/pdf', new TextEncoder().encode('%PDF-1.7'))).toBe(true)
    expect(hasValidMediaSignature('image/webp', new TextEncoder().encode('RIFFxxxxWEBP'))).toBe(true)
  })
})
