import { test, expect } from '@playwright/test'
import { OTP, APP_VERSION, PINCODE } from '../../../shared/utils/env'
import {
  seedFromProfile,
  cleanupFromProfile,
  SeedContext,
} from '../../helpers/seed'
import { phoneSignupProfile } from '../../helpers/profiles/phone'
import { firebaseSignIn, firebaseRefreshToken } from '../../helpers/firebase'
import { validateSchema } from '../../../shared/utils/schema'
import {
  OtpRequestSchema,
  OtpVerifySchema,
  FirebaseSignInSchema,
  FirebaseRefreshSchema,
  CreatePinSchema,
  GetProfileSchema,
} from '../../schema/signup.schema'
import { endpoints } from '../../../shared/endpoints'

test.describe('Signup by Phone', () => {
  let ctx: SeedContext

  test.beforeEach(async ({ request }) => {
    await test.step('Seed from phoneSignupProfile', async () => {
      ctx = await seedFromProfile(request, phoneSignupProfile)
    })
  })

  test.afterEach(async ({ request }) => {
    await test.step('Cleanup from phoneSignupProfile', async () => {
      await cleanupFromProfile(request, phoneSignupProfile, ctx)
    })
  })

  test('should complete full signup flow for a valid phone number', async ({
    request,
  }) => {
    const phone = ctx.identifiers.phone!
    let refCode: string
    let firebaseCustomToken: string
    let firebaseRefreshTok: string
    let idTokenPrePin: string
    let idTokenPostPin: string

    await test.step('Step 1: Request OTP', async () => {
      const response = await request.post(endpoints.signup.requestOtp, {
        data: { phone },
        headers: { 'x-app-version': APP_VERSION },
      })

      expect(response.status()).toBe(200)
      const body = await response.json()
      validateSchema(body, OtpRequestSchema, 'OTP request')
      expect(body.is_signup).toBe(false)
      expect(body.next_state).toBe('signup.phone.verify')
      refCode = body.verification_info.ref_code as string
    })

    await test.step('Step 2: Verify OTP', async () => {
      const response = await request.post(endpoints.signup.verifyOtp, {
        params: { action: 'verify' },
        data: { phone, ref_code: refCode, code: OTP },
        headers: { 'x-app-version': APP_VERSION },
      })

      expect(response.status()).toBe(200)
      const body = await response.json()
      validateSchema(body, OtpVerifySchema, 'OTP verify')
      expect(body.is_signup).toBe(true)
      expect(body.next_state).toBe('user.profile')
      firebaseCustomToken = body.verification_info.token as string
    })

    await test.step('Step 3: Firebase sign in with custom token', async () => {
      const result = await firebaseSignIn(request, firebaseCustomToken)
      validateSchema(result, FirebaseSignInSchema, 'Firebase sign in')
      firebaseRefreshTok = result.refreshToken as string
    })

    await test.step('Step 4: Get Firebase ID token (pre-PIN)', async () => {
      const result = await firebaseRefreshToken(request, firebaseRefreshTok)
      validateSchema(
        result,
        FirebaseRefreshSchema,
        'Firebase refresh (pre-PIN)'
      )
      idTokenPrePin = result.id_token as string
    })

    await test.step('Step 5: Create PIN', async () => {
      const response = await request.post(endpoints.signup.createPin, {
        data: { pincode: PINCODE },
        headers: {
          'x-app-version': APP_VERSION,
          Authorization: `Bearer ${idTokenPrePin}`,
        },
      })

      expect(response.status()).toBe(200)
      const body = await response.json()
      validateSchema(body, CreatePinSchema, 'Create PIN')
      expect(body.message).toBe('Create PIN successfully')
    })

    await test.step('Step 6: Get Firebase ID token (post-PIN)', async () => {
      const result = await firebaseRefreshToken(request, firebaseRefreshTok)
      validateSchema(
        result,
        FirebaseRefreshSchema,
        'Firebase refresh (post-PIN)'
      )
      idTokenPostPin = result.id_token as string
    })

    await test.step('Step 7: Get Profile', async () => {
      const response = await request.get(endpoints.signup.getProfile, {
        headers: {
          'x-app-version': APP_VERSION,
          Authorization: `Bearer ${idTokenPostPin}`,
        },
      })

      expect(response.status()).toBe(200)
      const body = await response.json()
      validateSchema(body, GetProfileSchema, 'Get profile')
      expect(body.profile.phone).toBe(phone)
      expect(body.profile.has_pincode).toBe(true)
      expect(body.profile.signup_at).not.toBeNull()
    })

    await test.step('Step 8: Logout (best-effort)', async () => {
      try {
        await request.post(endpoints.signup.logout, {
          headers: {
            'x-app-version': APP_VERSION,
            Authorization: `Bearer ${idTokenPostPin}`,
          },
        })
      } catch {
        // logout failure does not fail the test
      }
    })
  })
})
