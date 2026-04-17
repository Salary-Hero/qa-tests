import { test, expect } from '@playwright/test'
import { OTP, APP_VERSION, PINCODE } from '../../../shared/utils/env'
import {
  seedFromProfile,
  cleanupFromProfile,
  SeedContext,
  SeedProfile,
} from '../../helpers/seed'
import {
  employeeIdSignupProfile,
  employeeIdPassportSignupProfile,
} from '../../helpers/profiles/employee-id'
import { firebaseSignIn, firebaseRefreshToken } from '../../helpers/firebase'
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

async function runSignupFlow(
  request: APIRequestContext,
  ctx: SeedContext,
  identity: string
) {
  const { employee_id, phone } = ctx.identifiers
  const company_id = ctx.company.id

  let authChallenge: string
  let refCode: string
  let firebaseCustomToken: string
  let firebaseRefreshTok: string
  let idTokenPrePin: string
  let idTokenPostPin: string

  await test.step('Step 1: Lookup employee by ID and identity', async () => {
    const response = await request.post(endpoints.signup.employeeIdLookup, {
      data: { employee_id, identity, company_id },
      headers: { 'x-app-version': APP_VERSION },
    })

    expect(response.status()).toBe(200)
    const body = await response.json()
    validateSchema(body, EmployeeIdLookupSchema, 'Employee ID lookup')
    expect(body.is_signup).toBe(false)
    authChallenge = body.verification_info.auth_challenge as string
  })

  await test.step('Step 2: Request OTP for phone', async () => {
    const response = await request.post(endpoints.signup.employeeIdAddPhone, {
      params: { verification_method: 'otp', action: 'request' },
      data: { phone, auth_challenge: authChallenge },
      headers: { 'x-app-version': APP_VERSION },
    })

    expect(response.status()).toBe(200)
    const body = await response.json()
    validateSchema(body, EmployeeIdOtpRequestSchema, 'Employee ID OTP request')
    refCode = body.verification.ref_code as string
  })

  await test.step('Step 3: Verify OTP', async () => {
    const response = await request.post(endpoints.signup.employeeIdAddPhone, {
      params: { verification_method: 'otp', action: 'verify' },
      data: {
        phone,
        auth_challenge: authChallenge,
        fcm_token: '',
        verification: { ref_code: refCode, code: OTP },
      },
      headers: { 'x-app-version': APP_VERSION },
    })

    expect(response.status()).toBe(200)
    const body = await response.json()
    validateSchema(body, EmployeeIdOtpVerifySchema, 'Employee ID OTP verify')
    firebaseCustomToken = body.verification.token as string
  })

  await test.step('Step 4: Firebase sign in with custom token', async () => {
    const result = await firebaseSignIn(request, firebaseCustomToken)
    validateSchema(result, FirebaseSignInSchema, 'Firebase sign in')
    firebaseRefreshTok = result.refreshToken as string
  })

  await test.step('Step 5: Get Firebase ID token (pre-PIN)', async () => {
    const result = await firebaseRefreshToken(request, firebaseRefreshTok)
    validateSchema(result, FirebaseRefreshSchema, 'Firebase refresh (pre-PIN)')
    idTokenPrePin = result.id_token as string
  })

  await test.step('Step 6: Create PIN', async () => {
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

  await test.step('Step 7: Get Firebase ID token (post-PIN)', async () => {
    const result = await firebaseRefreshToken(request, firebaseRefreshTok)
    validateSchema(result, FirebaseRefreshSchema, 'Firebase refresh (post-PIN)')
    idTokenPostPin = result.id_token as string
  })

  await test.step('Step 8: Get Profile', async () => {
    const response = await request.get(endpoints.signup.getProfile, {
      headers: {
        'x-app-version': APP_VERSION,
        Authorization: `Bearer ${idTokenPostPin}`,
      },
    })

    expect(response.status()).toBe(200)
    const body = await response.json()
    validateSchema(body, GetProfileSchema, 'Get profile')
    expect(body.profile.employee_id).toBe(employee_id)
    expect(body.profile.has_pincode).toBe(true)
    expect(body.profile.signup_at).not.toBeNull()
  })

  await test.step('Step 9: Logout (best-effort)', async () => {
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
}

function makeSignupDescribe(label: string, profile: SeedProfile) {
  test.describe(label, () => {
    let ctx: SeedContext

    test.beforeEach(async ({ request }) => {
      await test.step(`Seed from ${profile.name}`, async () => {
        ctx = await seedFromProfile(request, profile)
      })
    })

    test.afterEach(async ({ request }) => {
      await test.step(`Cleanup from ${profile.name}`, async () => {
        await cleanupFromProfile(request, profile, ctx)
      })
    })

    return { ctx: () => ctx }
  })
}

test.describe('Signup by Employee ID', () => {
  test.describe('with national ID', () => {
    let ctx: SeedContext

    test.beforeEach(async ({ request }) => {
      await test.step('Seed from employeeIdSignupProfile', async () => {
        ctx = await seedFromProfile(request, employeeIdSignupProfile)
      })
    })

    test.afterEach(async ({ request }) => {
      await test.step('Cleanup from employeeIdSignupProfile', async () => {
        await cleanupFromProfile(request, employeeIdSignupProfile, ctx)
      })
    })

    test('should complete full signup flow using national ID', async ({
      request,
    }) => {
      await runSignupFlow(request, ctx, ctx.identifiers.national_id!)
    })
  })

  test.describe('with passport number', () => {
    let ctx: SeedContext

    test.beforeEach(async ({ request }) => {
      await test.step('Seed from employeeIdPassportSignupProfile', async () => {
        ctx = await seedFromProfile(request, employeeIdPassportSignupProfile)
      })
    })

    test.afterEach(async ({ request }) => {
      await test.step('Cleanup from employeeIdPassportSignupProfile', async () => {
        await cleanupFromProfile(request, employeeIdPassportSignupProfile, ctx)
      })
    })

    test('should complete full signup flow using passport number', async ({
      request,
    }) => {
      await runSignupFlow(request, ctx, ctx.identifiers.passport_no!)
    })
  })
})
