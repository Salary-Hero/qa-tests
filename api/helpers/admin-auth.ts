import { APIRequestContext } from '@playwright/test'
import { endpoints } from '../../shared/endpoints'
import { ADMIN_EMAIL, ADMIN_PASSWORD } from '../../shared/utils/env'

/**
 * Module-level token cache keyed by ENV string.
 * Tokens are valid for ~1 hour; safe to cache for the duration of a test run.
 */
const tokenCache = new Map<string, string>()

export async function getAdminToken(
  request: APIRequestContext
): Promise<string> {
  const cacheKey = `${ADMIN_EMAIL}`

  if (tokenCache.has(cacheKey)) {
    return tokenCache.get(cacheKey)!
  }

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error(
      'Admin credentials are not configured. ' +
        'Set ADMIN_EMAIL_<ENV> and ADMIN_PASSWORD_<ENV> in your .env file.'
    )
  }

  const response = await request.post(endpoints.admin.login, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  })

  if (!response.ok()) {
    throw new Error(
      `Admin login failed: ${response.status()} ${await response.text()}`
    )
  }

  const body = await response.json()
  const token: string = body.accessToken

  tokenCache.set(cacheKey, token)
  return token
}
