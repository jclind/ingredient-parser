// Spoonacular image-URL helper.
//
// Vendor→neutral *mapping* now lives server-side (the proxy's /v2 route returns
// the neutral shape). The only Spoonacular-specific concern left on the client
// is resolving an image filename to a CDN URL at the caller's chosen size — a
// display concern the server deliberately stays out of (it returns the filename).

import type { ImageSize } from './types.js'

const CDN = 'https://spoonacular.com/cdn/ingredients_'
const VALID_IMAGE_SIZES = new Set<ImageSize>(['100x100', '250x250', '500x500'])

/**
 * Resolve a Spoonacular image filename to a CDN URL at the given size. The size
 * is allowlisted — it's interpolated into the URL, so an arbitrary value (e.g.
 * "../../../etc") would be a path-traversal in the produced URL.
 */
export function buildImageUrl(
  filename: string | null,
  imageSize?: ImageSize
): string | null {
  // Reject anything that isn't a bare CDN filename — a path separator or `..`
  // (e.g. from a poisoned cache entry) must not produce a misleading URL.
  if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return null
  }
  const size = VALID_IMAGE_SIZES.has(imageSize as ImageSize)
    ? (imageSize as ImageSize)
    : '100x100'
  return `${CDN}${size}/${filename}`
}
