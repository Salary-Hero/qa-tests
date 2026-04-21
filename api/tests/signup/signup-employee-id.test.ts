import { test, expect } from '@playwright/test'
import { OTP, PINCODE } from '../../../shared/utils/env'
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
import { validateSchema } from '../../../shared/utils/schema'
import {
  EmployeeIdLookupSchema,
  EmployeeIdOtpRequestSchema,
  EmployeeIdOtpVerifySchema,
  FirebaseSignInSchema,
  FirebaseRefreshSchema,
  CreatePinSchema,
  GetProfileSchema,
} from '../../schema/signup.schema'
import { endpoints } from '../../../shared/endpoints'
import { APIRequestContext } from '@playwright/test'
import {
  DEFAULT_REQUEST_HEADERS,
  AUTH_HEADERS,
  EMPLOYEE_ID_VERIFY_PARAMS,
} from '../../helpers/request'

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
    const response = await request.post(endpoints.signup.employeeIdLookup, {
      data: { employee_id, identity: verificationIdentifier, company_id },
      headers: DEFAULT_REQUEST_HEADERS,
    })

    expect(response.status()).toBe(200)
    const body = await response.json()
    validateSchema(body, EmployeeIdLookupSchema, 'Employee ID lookup')
    expect(body.is_signup).toBe(false)
    authChallenge = body.verification_info.auth_challenge as string
  })

  await test.step('Request OTP for phone', async () => {
    const response = await request.post(endpoints.signup.employeeIdAddPhone, {
      params: { verification_method: 'otp', action: 'request' },
      data: { phone, auth_challenge: authChallenge },
      headers: DEFAULT_REQUEST_HEADERS,
    })

    expect(response.status()).toBe(200)
    const body = await response.json()
    validateSchema(body, EmployeeIdOtpRequestSchema, 'Employee ID OTP request')
    refCode = body.verification.ref_code as string
  })

  await test.step('Verify OTP', async () => {
    const response = await request.post(endpoints.signup.employeeIdAddPhone, {
      params: { ...EMPLOYEE_ID_VERIFY_PARAMS, verification_method: 'otp' },
      data: {
        phone,
        auth_challenge: authChallenge,
        fcm_token: '',
        verification: { ref_code: refCode, code: OTP },
      },
      headers: DEFAULT_REQUEST_HEADERS,
    })

    expect(response.status()).toBe(200)
    const body = await response.json()
    validateSchema(body, EmployeeIdOtpVerifySchema, 'Employee ID OTP verify')
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
    expect(body.profile.employee_id).toBe(employee_id)
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
}

test.describe('Signup by Employee ID', () => {
  test.describe('with national ID', () => {
    const { beforeEach, afterEach, getContext } = setupSeedTeardown(
      employeeIdSignupProfile
    )
    test.beforeEach(beforeEach)
    test.afterEach(afterEach)

    test('should complete full signup flow using national ID', async ({
      request,
    }) => {
      const ctx = getContext()
      await runSignupFlow(request, ctx, ctx.identifiers.national_id!)
    })
  })

  test.describe('with passport number', () => {
    const { beforeEach, afterEach, getContext } = setupSeedTeardown(
      employeeIdPassportSignupProfile
    )
    test.beforeEach(beforeEach)
    test.afterEach(afterEach)

    test('should complete full signup flow using passport number', async ({
      request,
    }) => {
      const ctx = getContext()
      await runSignupFlow(request, ctx, ctx.identifiers.passport_no!)
    })
  })
})
