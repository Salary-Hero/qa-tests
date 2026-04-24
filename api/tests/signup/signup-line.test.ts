import { test, expect } from '@playwright/test'
import { LINE_CHANNEL_ID } from '../../../shared/utils/env'
import { OTP, PINCODE } from '../../../shared/utils/seed-config'
import { lineSignupProfile } from '../../helpers/profiles/line'
import { getLineAccessToken } from '../../helpers/line-auth'
import {
  firebaseSignIn,
  firebaseRefreshToken as firebaseRefreshTokenAPI,
} from '../../helpers/firebase'
import { setupSeedTeardown } from '../../helpers/test-setup'
import { parseResponse } from '../../../shared/utils/response'
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
  const { beforeEach, afterEach, getContext } = setupSeedTeardown(lineSignupProfile)
  test.beforeEach(beforeEach)
  test.afterEach(afterEach)

  test('should complete full signup flow for a valid LINE account', async ({ request }) => {
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
      const payload = { channel_id: LINE_CHANNEL_ID, access_token: lineAccessToken, fcm_token: '' }
      const response = await request.post(endpoints.signup.lineSignup, {
        data: payload,
        headers: DEFAULT_REQUEST_HEADERS,
      })
      const parsed = await parseResponse(response, LineSignupSchema, 'LINE signup', 200, payload)
      expect(parsed.is_signup).toBe(false)
      authChallenge = parsed.verification_info.auth_challenge
    })

    await test.step('Request OTP for phone', async () => {
      const payload = { phone, auth_challenge: authChallenge }
      const response = await request.post(endpoints.signup.lineAddPhone, {
        params: { verification_method: 'otp', action: 'request' },
        data: payload,
        headers: DEFAULT_REQUEST_HEADERS,
      })
      const parsed = await parseResponse(response, LineOtpRequestSchema, 'LINE OTP request', 200, payload)
      refCode = parsed.verification.ref_code
    })

    await test.step('Verify OTP', async () => {
      const payload = {
        phone,
        auth_challenge: authChallenge,
        fcm_token: '',
        authMethod: 'line',
        verification: { ref_code: refCode, code: OTP },
      }
      const response = await request.post(endpoints.signup.lineAddPhone, {
        params: { verification_method: 'otp', action: 'verify' },
        data: payload,
        headers: DEFAULT_REQUEST_HEADERS,
      })
      const parsed = await parseResponse(response, LineOtpVerifySchema, 'LINE OTP verify', 200, payload)
      firebaseCustomToken = parsed.verification.token
    })

    await test.step('Firebase sign in with custom token', async () => {
      const parsed = FirebaseSignInSchema.parse(await firebaseSignIn(request, firebaseCustomToken))
      firebaseRefreshToken = parsed.refreshToken
    })

    await test.step('Get Firebase ID token (pre-PIN)', async () => {
      const parsed = FirebaseRefreshSchema.parse(
        await firebaseRefreshTokenAPI(request, firebaseRefreshToken)
      )
      idTokenPrePin = parsed.id_token
    })

    await test.step('Create PIN', async () => {
      const payload = { pincode: PINCODE }
      const response = await request.post(endpoints.signup.createPin, {
        data: payload,
        headers: AUTH_HEADERS(idTokenPrePin),
      })
      const parsed = await parseResponse(response, CreatePinSchema, 'Create PIN', 200, payload)
      expect(parsed.message).toBe('Create PIN successfully')
    })

    await test.step('Get Firebase ID token (post-PIN)', async () => {
      const parsed = FirebaseRefreshSchema.parse(
        await firebaseRefreshTokenAPI(request, firebaseRefreshToken)
      )
      idTokenPostPin = parsed.id_token
    })

    await test.step('Get Profile', async () => {
      const response = await request.get(endpoints.signup.getProfile, {
        headers: AUTH_HEADERS(idTokenPostPin),
      })
      const parsed = await parseResponse(response, GetProfileSchema, 'Get Profile')
      expect(parsed.profile.line_id).toBe(line_id)
      expect(parsed.profile.has_pincode).toBe(true)
      expect(parsed.profile.signup_at).not.toBeNull()
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
