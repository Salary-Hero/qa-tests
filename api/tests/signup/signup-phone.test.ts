import { test, expect } from '@playwright/test'
import { OTP, PINCODE } from '../../../shared/utils/seed-config'
import { phoneSignupProfile } from '../../helpers/profiles/phone'
import {
  firebaseSignIn,
  firebaseRefreshToken as firebaseRefreshTokenAPI,
} from '../../helpers/firebase'
import { setupSeedTeardown } from '../../helpers/test-setup'
import { parseResponse } from '../../../shared/utils/response'
import {
  OtpRequestSchema,
  OtpVerifySchema,
  FirebaseSignInSchema,
  FirebaseRefreshSchema,
  CreatePinSchema,
  GetProfileSchema,
} from '../../schema/signup.schema'
import { endpoints } from '../../../shared/endpoints'
import {
  DEFAULT_REQUEST_HEADERS,
  AUTH_HEADERS,
  PHONE_VERIFY_PARAMS,
} from '../../helpers/request'

test.describe('Signup by Phone', () => {
  const { beforeEach, afterEach, getContext } = setupSeedTeardown(phoneSignupProfile)
  test.beforeEach(beforeEach)
  test.afterEach(afterEach)

  test('should complete full signup flow for a valid phone number', async ({ request }) => {
    const ctx = getContext()
    const phone = ctx.identifiers.phone!
    let refCode: string
    let firebaseCustomToken: string
    let firebaseRefreshToken: string
    let idTokenPrePin: string
    let idTokenPostPin: string

    await test.step('Request OTP', async () => {
      const payload = { phone }
      const response = await request.post(endpoints.signup.requestOtp, {
        data: payload,
        headers: DEFAULT_REQUEST_HEADERS,
      })
      const parsed = await parseResponse(response, OtpRequestSchema, 'Request OTP', 200, payload)
      expect(parsed.is_signup).toBe(false)
      expect(parsed.next_state).toBe('signup.phone.verify')
      refCode = parsed.verification_info.ref_code
    })

    await test.step('Verify OTP', async () => {
      const payload = { phone, ref_code: refCode, code: OTP }
      const response = await request.post(endpoints.signup.verifyOtp, {
        params: PHONE_VERIFY_PARAMS,
        data: payload,
        headers: DEFAULT_REQUEST_HEADERS,
      })
      const parsed = await parseResponse(response, OtpVerifySchema, 'Verify OTP', 200, payload)
      expect(parsed.is_signup).toBe(true)
      expect(parsed.next_state).toBe('user.profile')
      firebaseCustomToken = parsed.verification_info.token
    })

    await test.step('Firebase sign in with custom token', async () => {
      const raw = await firebaseSignIn(request, firebaseCustomToken)
      const parsed = FirebaseSignInSchema.parse(raw)
      firebaseRefreshToken = parsed.refreshToken
    })

    await test.step('Get Firebase ID token (pre-PIN)', async () => {
      const raw = await firebaseRefreshTokenAPI(request, firebaseRefreshToken)
      const parsed = FirebaseRefreshSchema.parse(raw)
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
      const raw = await firebaseRefreshTokenAPI(request, firebaseRefreshToken)
      const parsed = FirebaseRefreshSchema.parse(raw)
      idTokenPostPin = parsed.id_token
    })

    await test.step('Get Profile', async () => {
      const response = await request.get(endpoints.signup.getProfile, {
        headers: AUTH_HEADERS(idTokenPostPin),
      })
      const parsed = await parseResponse(response, GetProfileSchema, 'Get Profile')
      expect(parsed.profile.phone).toBe(phone)
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
