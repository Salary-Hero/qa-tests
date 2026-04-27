import { test, expect } from '@playwright/test'
import { SeedContext } from '../../helpers/seed'
import {
  employeeIdSignupProfile,
  employeeIdPassportSignupProfile,
} from '../../helpers/profiles/employee-id'
import {
  firebaseSignIn,
  firebaseRefreshToken as firebaseRefreshTokenAPI,
} from '../../helpers/firebase'
import { setupSeedTeardown } from '../../helpers/test-setup'
import { createPin } from '../../helpers/pin-api'
import { getProfile } from '../../helpers/profile-api'
import { logout } from '../../helpers/auth-api'
import {
  lookupEmployee,
  requestEmployeeIdOtp,
  verifyEmployeeIdOtp,
} from '../../helpers/employee-id-signup-api'
import { APIRequestContext } from '@playwright/test'

async function runSignupFlow(
  request: APIRequestContext,
  ctx: SeedContext,
  verificationIdentifier: string
) {
  const { employee_id, phone } = ctx.identifiers
  const company_id = ctx.company.id

  let authChallenge: string
  let refCode: string
  let firebaseCustomToken: string
  let firebaseRefreshToken: string
  let idTokenPrePin: string
  let idTokenPostPin: string

  await test.step('Lookup employee by ID and identity', async () => {
    authChallenge = await lookupEmployee(request, employee_id!, verificationIdentifier, company_id)
  })

  await test.step('Request OTP for phone', async () => {
    refCode = await requestEmployeeIdOtp(request, phone!, authChallenge)
  })

  await test.step('Verify OTP', async () => {
    firebaseCustomToken = await verifyEmployeeIdOtp(request, phone!, authChallenge, refCode)
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
    expect(body.profile.employee_id).toBe(employee_id)
    expect(body.profile.has_pincode).toBe(true)
    expect(body.profile.signup_at).not.toBeNull()
  })

  await test.step('Logout', async () => {
    await logout(request, idTokenPostPin)
  })
}

test.describe('Signup by Employee ID', () => {
  test.describe('with national ID', () => {
    const { beforeEach, afterEach, getContext } = setupSeedTeardown(employeeIdSignupProfile)
    test.beforeEach(beforeEach)
    test.afterEach(afterEach)

    test(
      'API – Signup Employee ID – Full signup flow with national ID – Success',
      { tag: ['@component', '@high', '@regression', '@guardian'] },
      async ({ request }) => {
        const ctx = getContext()
        await runSignupFlow(request, ctx, ctx.identifiers.national_id!)
      }
    )
  })

  test.describe('with passport number', () => {
    const { beforeEach, afterEach, getContext } = setupSeedTeardown(employeeIdPassportSignupProfile)
    test.beforeEach(beforeEach)
    test.afterEach(afterEach)

    test(
      'API – Signup Employee ID – Full signup flow with passport number – Success',
      { tag: ['@component', '@high', '@regression', '@guardian'] },
      async ({ request }) => {
        const ctx = getContext()
        await runSignupFlow(request, ctx, ctx.identifiers.passport_no!)
      }
    )
  })
})
