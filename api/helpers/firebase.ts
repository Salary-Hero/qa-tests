import { APIRequestContext } from '@playwright/test'
import { endpoints } from '../../shared/endpoints'
import { FIREBASE_API_KEY } from '../../shared/utils/env'

function requireFirebaseApiKey(): string {
  if (!FIREBASE_API_KEY) {
    throw new Error(
      'Firebase API key is not configured. ' +
        'Set FIREBASE_API_KEY_<ENV> in your .env file.'
    )
  }
  return FIREBASE_API_KEY
}

/**
 * Exchanges a Firebase custom token (from OTP verify response) for
 * Firebase auth credentials including a refresh token.
 */
export async function firebaseSignIn(
  request: APIRequestContext,
  customToken: string
): Promise<Record<string, unknown>> {
  const key = requireFirebaseApiKey()

  const response = await request.post(
    `${endpoints.firebase.signInWithCustomToken}?key=${key}`,
    {
      data: { token: customToken, returnSecureToken: true },
    }
  )

  if (!response.ok()) {
    throw new Error(
      `Firebase signIn failed: ${response.status()} ${await response.text()}`
    )
  }

  return response.json()
}

/**
 * Exchanges a Firebase refresh token for a fresh id_token.
 * Used both before and after PIN creation.
 */
export async function firebaseRefreshToken(
  request: APIRequestContext,
  refreshToken: string
): Promise<Record<string, unknown>> {
  const key = requireFirebaseApiKey()

  const response = await request.post(
    `${endpoints.firebase.refreshToken}?key=${key}`,
    {
      data: {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      },
    }
  )

  if (!response.ok()) {
    throw new Error(
      `Firebase refresh failed: ${response.status()} ${await response.text()}`
    )
  }

  return response.json()
}
