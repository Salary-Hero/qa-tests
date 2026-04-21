import { APIRequestContext } from '@playwright/test'
import { endpoints } from '../../shared/endpoints'
import { ADMIN_EMAIL, ADMIN_PASSWORD, ENV } from '../../shared/utils/env'
import { ENV_ERRORS } from '../../shared/utils/error-messages'

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
    throw new Error(ENV_ERRORS.ADMIN_CREDENTIALS(ENV))
  }

  const url = endpoints.admin.login
  const response = await request.post(url, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  })

  if (!response.ok()) {
    throw new Error(
      `Admin login failed\n` +
        `  POST ${url}\n` +
        `  Status: ${response.status()}\n` +
        `  Response: ${await response.text()}`
    )
  }

  const body = await response.json()
  const token: string = body.accessToken

  tokenCache.set(cacheKey, token)
  return token
}
