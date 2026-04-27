import { test, expect } from '@playwright/test'
import { lineSignupProfile } from '../../helpers/profiles/line'
import {
  firebaseSignIn,
  firebaseRefreshToken as firebaseRefreshTokenAPI,
} from '../../helpers/firebase'
import { setupSeedTeardown } from '../../helpers/test-setup'
import { createPin } from '../../helpers/pin-api'
import { getProfile } from '../../helpers/profile-api'
import { logout } from '../../helpers/auth-api'
import { submitLineToken, requestLineOtp, verifyLineOtp } from '../../helpers/line-signup-api'

test.describe('Signup by LINE', () => {
  test.describe.configure({ mode: 'serial' })
  const { beforeEach, afterEach, getContext } = setupSeedTeardown(lineSignupProfile)
  test.beforeEach(beforeEach)
  test.afterEach(afterEach)

  test(
    'API – Signup LINE – Full signup flow – Success',
    { tag: ['@component', '@high', '@regression', '@guardian'] },
    async ({ request }) => {
      const ctx = getContext()
      const { line_id, phone } = ctx.identifiers

      let authChallenge: string
      let refCode: string
      let firebaseCustomToken: string
      let firebaseRefreshToken: string
      let idTokenPrePin: string
      let idTokenPostPin: string

      await test.step('Submit LINE access token to get auth challenge', async () => {
        authChallenge = await submitLineToken(request)
      })

      await test.step('Request OTP for phone', async () => {
        refCode = await requestLineOtp(request, phone!, authChallenge)
      })

      await test.step('Verify OTP', async () => {
        firebaseCustomToken = await verifyLineOtp(request, phone!, authChallenge, refCode)
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
        expect(body.profile.line_id).toBe(line_id)
        expect(body.profile.has_pincode).toBe(true)
        expect(body.profile.signup_at).not.toBeNull()
      })

      await test.step('Logout', async () => {
        await logout(request, idTokenPostPin)
      })
    }
  )
})
