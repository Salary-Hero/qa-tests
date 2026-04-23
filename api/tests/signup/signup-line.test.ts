import { test, expect } from '@playwright/test'
import { OTP, PINCODE, LINE_CHANNEL_ID } from '../../../shared/utils/env'
import { SeedContext } from '../../helpers/seed'
import { lineSignupProfile } from '../../helpers/profiles/line'
import { getLineAccessToken } from '../../helpers/line-auth'
import {
  firebaseSignIn,
  firebaseRefreshToken as firebaseRefreshTokenAPI,
} from '../../helpers/firebase'
import { setupSeedTeardown } from '../../helpers/test-setup'
import { validateSchema } from '../../../shared/utils/schema'
import {
  LineSignupSchema,
  LineOtpRequestSchema,
  LineOtpVerifySchema,
  FirebaseSignInSchema,
  FirebaseRefreshSchema,
  CreatePinSchema,
  GetProfileSchema,
} from '../../schema/signup.schema'
import { endpoints } from '../../../shared/endpoints'
import {
  DEFAULT_REQUEST_HEADERS,
  AUTH_HEADERS,
} from '../../helpers/request'

test.describe('Signup by LINE', () => {
  test.describe.configure({ mode: 'serial' })
  const { beforeEach, afterEach, getContext } = setupSeedTeardown(
    lineSignupProfile
  )
  test.beforeEach(beforeEach)
  test.afterEach(afterEach)

  test('should complete full signup flow for a valid LINE account', async ({
    request,
  }) => {
    const ctx = getContext()
    const { line_id, phone } = ctx.identifiers

    let authChallenge: string
    let refCode: string
    let firebaseCustomToken: string
    let firebaseRefreshToken: string
    let idTokenPrePin: string
    let idTokenPostPin: string

    await test.step('Submit LINE access token to get auth challenge', async () => {
      const lineAccessToken = await getLineAccessToken(request)

      const response = await request.post(endpoints.signup.lineSignup, {
        data: {
          channel_id: LINE_CHANNEL_ID,
          access_token: lineAccessToken,
          fcm_token: '',
        },
        headers: DEFAULT_REQUEST_HEADERS,
      })

      expect(response.status()).toBe(200)
      const body = await response.json()
      validateSchema(body, LineSignupSchema, 'LINE signup')
      expect(body.is_signup).toBe(false)
      authChallenge = body.verification_info.auth_challenge as string
    })

    await test.step('Request OTP for phone', async () => {
      const response = await request.post(endpoints.signup.lineAddPhone, {
        params: { verification_method: 'otp', action: 'request' },
        data: { phone, auth_challenge: authChallenge },
        headers: DEFAULT_REQUEST_HEADERS,
      })

      expect(response.status()).toBe(200)
      const body = await response.json()
      validateSchema(body, LineOtpRequestSchema, 'LINE OTP request')
      refCode = body.verification.ref_code as string
    })

    await test.step('Verify OTP', async () => {
      const response = await request.post(endpoints.signup.lineAddPhone, {
        params: { verification_method: 'otp', action: 'verify' },
        data: {
          phone,
          auth_challenge: authChallenge,
          fcm_token: '',
          authMethod: 'line',
          verification: { ref_code: refCode, code: OTP },
        },
        headers: DEFAULT_REQUEST_HEADERS,
      })

      expect(response.status()).toBe(200)
      const body = await response.json()
      validateSchema(body, LineOtpVerifySchema, 'LINE OTP verify')
      firebaseCustomToken = body.verification.token as string
    })

    await test.step('Firebase sign in with custom token', async () => {
      const result = await firebaseSignIn(request, firebaseCustomToken)
      validateSchema(result, FirebaseSignInSchema, 'Firebase sign in')
      firebaseRefreshToken = result.refreshToken
    })

    await test.step('Get Firebase ID token (pre-PIN)', async () => {
      const result = await firebaseRefreshTokenAPI(request, firebaseRefreshToken)
      validateSchema(result, FirebaseRefreshSchema, 'Firebase refresh (pre-PIN)')
      idTokenPrePin = result.id_token as string
    })

    await test.step('Create PIN', async () => {
      const response = await request.post(endpoints.signup.createPin, {
        data: { pincode: PINCODE },
        headers: AUTH_HEADERS(idTokenPrePin),
      })

      expect(response.status()).toBe(200)
      const body = await response.json()
      validateSchema(body, CreatePinSchema, 'Create PIN')
      expect(body.message).toBe('Create PIN successfully')
    })

    await test.step('Get Firebase ID token (post-PIN)', async () => {
      const result = await firebaseRefreshTokenAPI(request, firebaseRefreshToken)
      validateSchema(result, FirebaseRefreshSchema, 'Firebase refresh (post-PIN)')
      idTokenPostPin = result.id_token as string
    })

    await test.step('Get Profile', async () => {
      const response = await request.get(endpoints.signup.getProfile, {
        headers: AUTH_HEADERS(idTokenPostPin),
      })

      expect(response.status()).toBe(200)
      const body = await response.json()
      validateSchema(body, GetProfileSchema, 'Get profile')
      expect(body.profile.line_id).toBe(line_id)
      expect(body.profile.has_pincode).toBe(true)
      expect(body.profile.signup_at).not.toBeNull()
    })

    await test.step('Logout (best-effort)', async () => {
      try {
        await request.post(endpoints.signup.logout, {
          headers: AUTH_HEADERS(idTokenPostPin),
        })
      } catch {
        // logout failure does not fail the test
      }
    })
  })
})
