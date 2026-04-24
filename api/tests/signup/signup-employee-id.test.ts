import { test, expect } from '@playwright/test'
import { OTP, PINCODE } from '../../../shared/utils/seed-config'
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
import { parseResponse } from '../../../shared/utils/response'
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
    const payload = { employee_id, identity: verificationIdentifier, company_id }
    const response = await request.post(endpoints.signup.employeeIdLookup, {
      data: payload,
      headers: DEFAULT_REQUEST_HEADERS,
    })
    const parsed = await parseResponse(response, EmployeeIdLookupSchema, 'Employee ID lookup', 200, payload)
    expect(parsed.is_signup).toBe(false)
    authChallenge = parsed.verification_info.auth_challenge
  })

  await test.step('Request OTP for phone', async () => {
    const payload = { phone, auth_challenge: authChallenge }
    const response = await request.post(endpoints.signup.employeeIdAddPhone, {
      params: { verification_method: 'otp', action: 'request' },
      data: payload,
      headers: DEFAULT_REQUEST_HEADERS,
    })
    const parsed = await parseResponse(response, EmployeeIdOtpRequestSchema, 'Employee ID OTP request', 200, payload)
    refCode = parsed.verification.ref_code
  })

  await test.step('Verify OTP', async () => {
    const payload = {
      phone,
      auth_challenge: authChallenge,
      fcm_token: '',
      verification: { ref_code: refCode, code: OTP },
    }
    const response = await request.post(endpoints.signup.employeeIdAddPhone, {
      params: { ...EMPLOYEE_ID_VERIFY_PARAMS, verification_method: 'otp' },
      data: payload,
      headers: DEFAULT_REQUEST_HEADERS,
    })
    const parsed = await parseResponse(response, EmployeeIdOtpVerifySchema, 'Employee ID OTP verify', 200, payload)
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
    expect(parsed.profile.employee_id).toBe(employee_id)
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
}

test.describe('Signup by Employee ID', () => {
  test.describe('with national ID', () => {
    const { beforeEach, afterEach, getContext } = setupSeedTeardown(employeeIdSignupProfile)
    test.beforeEach(beforeEach)
    test.afterEach(afterEach)

    test('should complete full signup flow using national ID', async ({ request }) => {
      const ctx = getContext()
      await runSignupFlow(request, ctx, ctx.identifiers.national_id!)
    })
  })

  test.describe('with passport number', () => {
    const { beforeEach, afterEach, getContext } = setupSeedTeardown(employeeIdPassportSignupProfile)
    test.beforeEach(beforeEach)
    test.afterEach(afterEach)

    test('should complete full signup flow using passport number', async ({ request }) => {
      const ctx = getContext()
      await runSignupFlow(request, ctx, ctx.identifiers.passport_no!)
    })
  })
})
