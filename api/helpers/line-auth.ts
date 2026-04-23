import { APIRequestContext } from '@playwright/test'
import {
  LINE_CHANNEL_ID,
  LINE_CHANNEL_SECRET,
  LINE_REFRESH_TOKEN,
  ENV,
} from '../../shared/utils/env'
import { endpoints } from '../../shared/endpoints'
import { ENV_ERRORS } from '../../shared/utils/error-messages'

/**
 * Refreshes the LINE user access token using the stored refresh token.
 * Returns a fresh access_token valid for ~30 days.
 *
 * Prerequisites — set in .env per environment:
 *   LINE_CHANNEL_ID_DEV, LINE_CHANNEL_SECRET_DEV, LINE_REFRESH_TOKEN_DEV
 */
export async function getLineAccessToken(
  request: APIRequestContext
): Promise<string> {
  if (!LINE_CHANNEL_ID || !LINE_CHANNEL_SECRET || !LINE_REFRESH_TOKEN) {
    throw new Error(ENV_ERRORS.LINE_CREDENTIALS(ENV))
  }

  const url = endpoints.line.refreshToken
  const response = await request.post(url, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    form: {
      grant_type: 'refresh_token',
      refresh_token: LINE_REFRESH_TOKEN,
      client_id: LINE_CHANNEL_ID,
      client_secret: LINE_CHANNEL_SECRET,
    },
  })

  if (!response.ok()) {
    throw new Error(
      `LINE token refresh failed\n` +
        `  POST ${url}\n` +
        `  Status: ${response.status()}\n` +
        `  Response: ${await response.text()}`
    )
  }

  const body = await response.json()
  return body.access_token as string
}
