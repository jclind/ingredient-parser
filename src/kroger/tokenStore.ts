/**
 * Caches a single OAuth bearer token and refreshes it only when it is missing
 * or within `skewMs` of expiring. Concurrent callers share one in-flight
 * refresh so we never request two tokens at once.
 */
export class TokenStore {
  private token: string | null = null
  private expiresAt = 0
  private pending: Promise<string> | null = null

  constructor(
    private readonly refresh: () => Promise<{
      accessToken: string
      expiresInSec: number
    }>,
    private readonly skewMs = 30_000
  ) {}

  async get(): Promise<string> {
    if (this.token && Date.now() < this.expiresAt - this.skewMs) {
      return this.token
    }
    if (this.pending) return this.pending

    this.pending = this.refresh()
      .then(({ accessToken, expiresInSec }) => {
        this.token = accessToken
        this.expiresAt = Date.now() + expiresInSec * 1000
        return accessToken
      })
      .finally(() => {
        this.pending = null
      })

    return this.pending
  }

  /** Force the next get() to refresh — call this after a 401. */
  invalidate(): void {
    this.token = null
    this.expiresAt = 0
  }
}
