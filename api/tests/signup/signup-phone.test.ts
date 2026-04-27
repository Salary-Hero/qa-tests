import { test, expect } from '@playwright/test'
import { OTP } from '../../../shared/utils/seed-config'
import { phoneSignupProfile } from '../../helpers/profiles/phone'
import {
  firebaseSignIn,
  firebaseRefreshToken as firebaseRefreshTokenAPI,
} from '../../helpers/firebase'
import { setupSeedTeardown } from '../../helpers/test-setup'
import { parseResponse } from '../../../shared/utils/response'
import { createPin, getProfile, logout } from '../../helpers/signup-flow'
import { OtpRequestSchema, OtpVerifySchema } from '../../schema/signup.schema'
import { endpoints } from '../../../shared/endpoints'
import { DEFAULT_REQUEST_HEADERS, PHONE_VERIFY_PARAMS } from '../../helpers/request'

test.describe('Signup by Phone', () => {
  const { beforeEach, afterEach, getContext } = setupSeedTeardown(phoneSignupProfile)
  test.beforeEach(beforeEach)
  test.afterEach(afterEach)

  test(
    'API – Signup Phone – Full signup flow – Success',
    { tag: ['@component', '@high', '@smoke', '@regression', '@guardian'] },
    async ({ request }) => {
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
        const result = await firebaseSignIn(request, firebaseCustomToken)
        firebaseRefreshToken = result.refreshToken
      })

      await test.step('Get Firebase ID token (pre-PIN)', async () => {
        const result = await firebaseRefreshTokenAPI(request, firebaseRefreshToken)
        idTokenPrePin = result.id_token
      })

      await test.step('Create PIN', async () => {
        await createPin(request, idTokenPrePin)
      })

      await test.step('Get Firebase ID token (post-PIN)', async () => {
        const result = await firebaseRefreshTokenAPI(request, firebaseRefreshToken)
        idTokenPostPin = result.id_token
      })

      await test.step('Get Profile', async () => {
        const body = await getProfile(request, idTokenPostPin)
        expect(body.profile.phone).toBe(phone)
        expect(body.profile.has_pincode).toBe(true)
        expect(body.profile.signup_at).not.toBeNull()
      })
    }
  )
})
