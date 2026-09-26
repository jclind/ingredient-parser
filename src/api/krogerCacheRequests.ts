import { createIngredientServerHttp } from './http.js'
import { KrogerPriceData } from '../../types.js'

/**
 * Read a cached Kroger price for a store + ingredient name. Any server error is
 * treated as a cache miss so a live Kroger lookup can take over.
 */
export const getKrogerPriceFromServer = async (
  locationId: string,
  name: string,
  serverUrl?: string
): Promise<KrogerPriceData | null> => {
  try {
    const serverHttp = createIngredientServerHttp(serverUrl)
    const response = await serverHttp.get(
      `/kroger-price/${encodeURIComponent(locationId)}/${encodeURIComponent(name)}`
    )
    return response.data.data ?? null
  } catch {
    return null
  }
}

/**
 * Persist a freshly fetched Kroger price. Fire-and-forget — a failed write must
 * not affect the caller. `priceData.locationId` is the store partition key.
 */
export const saveKrogerPriceToServer = (
  name: string,
  priceData: KrogerPriceData,
  serverUrl?: string
): void => {
  const serverHttp = createIngredientServerHttp(serverUrl)
  serverHttp.post('/kroger-price', { name, priceData }).catch(() => {
    // Fire-and-forget.
  })
}
