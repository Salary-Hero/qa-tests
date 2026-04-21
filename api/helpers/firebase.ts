import { APIRequestContext } from '@playwright/test'
import { z } from 'zod'
import { endpoints } from '../../shared/endpoints'
import { FIREBASE_API_KEY, ENV } from '../../shared/utils/env'
import { ENV_ERRORS } from '../../shared/utils/error-messages'

const FirebaseSignInResponseSchema = z.object({
  kind: z.string(),
  idToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.string(),
  isNewUser: z.boolean(),
})

const FirebaseRefreshTokenResponseSchema = z.object({
  id_token: z.string(),
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.union([z.number(), z.string()]),
  token_type: z.string().optional(),
})

export type FirebaseSignInResponse = z.infer<typeof FirebaseSignInResponseSchema>
export type FirebaseRefreshTokenResponse = z.infer<
  typeof FirebaseRefreshTokenResponseSchema
>

function requireFirebaseApiKey(): string {
  if (!FIREBASE_API_KEY) {
    throw new Error(ENV_ERRORS.FIREBASE_API_KEY(ENV))
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
): Promise<FirebaseSignInResponse> {
  const key = requireFirebaseApiKey()
  const url = `${endpoints.firebase.signInWithCustomToken}?key=${key}`

  const response = await request.post(url, {
    data: { token: customToken, returnSecureToken: true },
  })

  if (!response.ok()) {
    throw new Error(
      `Firebase signIn failed\n` +
        `  POST ${url}\n` +
        `  Status: ${response.status()}\n` +
        `  Response: ${await response.text()}`
    )
  }

  const body = await response.json()
  const parsed = FirebaseSignInResponseSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error(
      `Firebase signIn returned invalid response: ${parsed.error.message}`
    )
  }

  return parsed.data
}

/**
 * Exchanges a Firebase refresh token for a fresh id_token.
 * Used both before and after PIN creation.
 */
export async function firebaseRefreshToken(
  request: APIRequestContext,
  refreshToken: string
): Promise<FirebaseRefreshTokenResponse> {
  const key = requireFirebaseApiKey()
  const url = `${endpoints.firebase.refreshToken}?key=${key}`

  const response = await request.post(url, {
    data: {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    },
  })

  if (!response.ok()) {
    throw new Error(
      `Firebase refresh failed\n` +
        `  POST ${url}\n` +
        `  Status: ${response.status()}\n` +
        `  Response: ${await response.text()}`
    )
  }

  const body = await response.json()
  const parsed = FirebaseRefreshTokenResponseSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error(
      `Firebase refresh returned invalid response: ${parsed.error.message}`
    )
  }

  return parsed.data
}
