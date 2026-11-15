export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
export const MEDIA_TYPES = [...IMAGE_TYPES, 'application/pdf'] as const
export const MAX_MEDIA_BYTES = 25 * 1024 * 1024

export function safeMediaFilename(name: string) {
  return name.normalize('NFKC').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 160) || 'upload'
}

export function hasValidMediaSignature(mimeType: string, bytes?: Uint8Array) {
  if (!bytes) return false
  if (mimeType === 'image/png') return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  if (mimeType === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (mimeType === 'image/webp') return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  if (mimeType === 'application/pdf') return String.fromCharCode(...bytes.slice(0, 4)) === '%PDF'
  return false
}
