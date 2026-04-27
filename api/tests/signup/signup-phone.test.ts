import { test, expect } from '@playwright/test'
import { phoneSignupProfile } from '../../helpers/profiles/phone'
import {
  firebaseSignIn,
  firebaseRefreshToken as firebaseRefreshTokenAPI,
} from '../../helpers/firebase'
import { setupSeedTeardown } from '../../helpers/test-setup'
import { createPin } from '../../helpers/pin-api'
import { getProfile } from '../../helpers/profile-api'
import { logout } from '../../helpers/auth-api'
import { requestPhoneOtp, verifyPhoneOtp } from '../../helpers/phone-signup-api'

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
        refCode = await requestPhoneOtp(request, phone)
      })

      await test.step('Verify OTP', async () => {
        firebaseCustomToken = await verifyPhoneOtp(request, phone, refCode)
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

      await test.step('Logout', async () => {
        await logout(request, idTokenPostPin)
      })
    }
  )
})
