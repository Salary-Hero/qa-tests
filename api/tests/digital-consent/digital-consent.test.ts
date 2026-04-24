import { test, expect } from '@playwright/test'
import { getAdminToken } from '../../helpers/admin-auth'
import { importDigitalConsentData } from '../../helpers/digital-consent-import'
import { resolvePhone, generateEmail } from '../../helpers/identifiers'
import {
  firebaseSignIn,
  firebaseRefreshToken as firebaseRefreshTokenAPI,
} from '../../helpers/firebase'
import { parseResponse } from '../../../shared/utils/response'
import {
  findSignedUpUserIds,
  deleteEmployeeProfileRecords,
  getEmployeeProfiles,
  getEmployeeConsentStatus,
  hardDeleteEmployee,
} from '../../../shared/db-helpers'
import { endpoints } from '../../../shared/endpoints'
import { getCompany, seedConfigForEnv } from '../../../shared/utils/seed-config'
import { PINCODE } from '../../../shared/utils/seed-config'
import { DEFAULT_REQUEST_HEADERS, AUTH_HEADERS } from '../../helpers/request'
import {
  ScreeningValidateSchema,
  ConsentRequestFormSchema,
  ConsentVerifyFormSchema,
} from '../../schema/digital-consent.schema'
import {
  FirebaseSignInSchema,
  FirebaseRefreshSchema,
  CreatePinSchema,
  GetProfileSchema,
} from '../../schema/signup.schema'

const COMPANY_ID = getCompany('digital_consent').id
const TEST_EMPLOYEES = [
  { employee_id: 'TS01900', national_id: '2001000099000', passport_no: 'TSPP1900' },
  { employee_id: 'TS01901', national_id: '2001000099001', passport_no: 'TSPP1901' },
  { employee_id: 'TS01902', national_id: '2001000099002', passport_no: 'TSPP1902' },
  { employee_id: 'TS01903', national_id: '2001000099003', passport_no: 'TSPP1903' },
]
const TEST_EMPLOYEE_IDS = TEST_EMPLOYEES.map((e) => e.employee_id)
const TEST_NATIONAL_IDS = TEST_EMPLOYEES.map((e) => e.national_id)
const TEST_PASSPORT_NOS = TEST_EMPLOYEES.map((e) => e.passport_no)

/**
 * Finds and deletes users from previous test runs via user_identity.
 * The import worker checks user_identity before creating employee_profile records —
 * if national_id or passport_no already exists there, the import silently skips
 * that employee. Deleting via admin API cascades to user_identity, employment,
 * user_balance, and users.
 */
async function cleanupSignedUpUsers() {
  const userIds = await findSignedUpUserIds(TEST_NATIONAL_IDS, TEST_PASSPORT_NOS)
  for (const userId of userIds) {
    try {
      await hardDeleteEmployee(userId)
    } catch {
      // best-effort — user may already be gone
    }
  }
}

test.describe('Digital Consent', () => {
  test.describe.configure({ mode: 'serial' })

  let adminToken: string
  let signedUpUserId: string | null = null

  test.beforeAll(async ({ request }) => {
    await test.step('Cleanup signed-up users from previous runs', async () => {
      await cleanupSignedUpUsers()
    })

    await test.step('Cleanup employee_profile records from previous runs', async () => {
      await deleteEmployeeProfileRecords(TEST_EMPLOYEE_IDS, COMPANY_ID)
    })

    await test.step('Login as admin', async () => {
      adminToken = await getAdminToken(request)
    })

    await test.step('Run 7-step Digital Consent import', async () => {
      await importDigitalConsentData(request, adminToken)
      // Allow time for the async import worker to process
      await new Promise((resolve) => setTimeout(resolve, 3000))
    })
  })

  test.afterAll(async () => {
    await test.step('Cleanup signed-up users', async () => {
      await cleanupSignedUpUsers()
    })

    await test.step('Cleanup employee_profile records', async () => {
      await deleteEmployeeProfileRecords(TEST_EMPLOYEE_IDS, COMPANY_ID)
    })
  })

  test.afterEach(async () => {
    await test.step('Cleanup signed-up user from this test', async () => {
      if (signedUpUserId) {
        await hardDeleteEmployee(signedUpUserId)
        signedUpUserId = null
      }
    })
  })

  test('TC-CONSENT-001 · Import — verify all 4 records created with consent_status = new', async () => {
    await test.step('Verify 4 employee_profile rows exist with consent_status = new', async () => {
      const rows = await getEmployeeProfiles(TEST_EMPLOYEE_IDS, COMPANY_ID)
      expect(rows.length).toBe(4)
      for (const row of rows) {
        expect(row.consent_status).toBe('new')
      }
    })
  })

  test('TC-CONSENT-002 · Signup with national_id — verify consent_status = pending_review', async ({
    request,
  }) => {
    const employee = TEST_EMPLOYEES[0] // TS01900
    const phone = resolvePhone()
    const email = generateEmail()
    let refCode: string
    let firebaseCustomToken: string
    let firebaseRefreshToken: string
    let idTokenPrePin: string
    let idTokenPostPin: string

    await test.step('Validate screening identity (national_id)', async () => {
      const payload = {
        employee_id: employee.employee_id,
        personal_id: employee.national_id,
        personal_id_type: 'national_id',
        company_id: COMPANY_ID,
      }
      const response = await request.post(endpoints.consent.screeningValidate, {
        headers: DEFAULT_REQUEST_HEADERS,
        data: payload,
      })
      await parseResponse(response, ScreeningValidateSchema, 'Screening Validate', 200, payload)
    })

    await test.step('Submit consent request form', async () => {
      const payload = {
        personal_id_type: 'national_id',
        company_id: COMPANY_ID,
        screening: {
          employee_id: employee.employee_id,
          personal_id: employee.national_id,
        },
        request_form: { first_name: 'QA', last_name: 'Consent', email, phone },
      }
      const response = await request.post(endpoints.consent.requestForm, {
        headers: DEFAULT_REQUEST_HEADERS,
        data: payload,
      })
      const parsed = await parseResponse(response, ConsentRequestFormSchema, 'Request Form', 200, payload)
      refCode = parsed.verification.ref_code
    })

    await test.step('Verify OTP', async () => {
      const payload = { ref_code: refCode, code: seedConfigForEnv.otp, phone }
      const response = await request.post(endpoints.consent.verifyForm, {
        headers: DEFAULT_REQUEST_HEADERS,
        data: payload,
      })
      const parsed = await parseResponse(response, ConsentVerifyFormSchema, 'Verify Form', 200, payload)
      firebaseCustomToken = parsed.verification_info.token
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
        headers: AUTH_HEADERS(idTokenPrePin),
        data: payload,
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

    await test.step('Get profile — verify consent accepted', async () => {
      const response = await request.get(endpoints.signup.getProfile, {
        headers: AUTH_HEADERS(idTokenPostPin),
      })
      const parsed = await parseResponse(response, GetProfileSchema, 'Get Profile')
      expect(parsed.profile.is_consent_accepted).toBe(true)
      expect(parsed.profile.has_pincode).toBe(true)
      signedUpUserId = parsed.profile.user_id
    })

    await test.step('DB — verify consent_status = pending_review', async () => {
      const status = await getEmployeeConsentStatus(employee.employee_id, COMPANY_ID)
      expect(status).toBe('pending_review')
    })

    await test.step('Logout (best-effort)', async () => {
      try {
        await request.post(endpoints.signup.logout, { headers: AUTH_HEADERS(idTokenPostPin) })
      } catch {
        // logout failure does not fail the test
      }
    })
  })

  test('TC-CONSENT-003 · Signup with passport_no — verify consent_status = pending_review', async ({
    request,
  }) => {
    const employee = TEST_EMPLOYEES[1] // TS01901
    const phone = resolvePhone()
    const email = generateEmail()
    let refCode: string
    let firebaseCustomToken: string
    let firebaseRefreshToken: string
    let idTokenPrePin: string
    let idTokenPostPin: string

    await test.step('Validate screening identity (passport_no)', async () => {
      const payload = {
        employee_id: employee.employee_id,
        personal_id: employee.passport_no,
        personal_id_type: 'passport_no',
        company_id: COMPANY_ID,
      }
      const response = await request.post(endpoints.consent.screeningValidate, {
        headers: DEFAULT_REQUEST_HEADERS,
        data: payload,
      })
      await parseResponse(response, ScreeningValidateSchema, 'Screening Validate', 200, payload)
    })

    await test.step('Submit consent request form', async () => {
      const payload = {
        personal_id_type: 'passport_no',
        company_id: COMPANY_ID,
        screening: {
          employee_id: employee.employee_id,
          personal_id: employee.passport_no,
        },
        request_form: { first_name: 'QA', last_name: 'Consent', email, phone },
      }
      const response = await request.post(endpoints.consent.requestForm, {
        headers: DEFAULT_REQUEST_HEADERS,
        data: payload,
      })
      const parsed = await parseResponse(response, ConsentRequestFormSchema, 'Request Form', 200, payload)
      refCode = parsed.verification.ref_code
    })

    await test.step('Verify OTP', async () => {
      const payload = { ref_code: refCode, code: seedConfigForEnv.otp, phone }
      const response = await request.post(endpoints.consent.verifyForm, {
        headers: DEFAULT_REQUEST_HEADERS,
        data: payload,
      })
      const parsed = await parseResponse(response, ConsentVerifyFormSchema, 'Verify Form', 200, payload)
      firebaseCustomToken = parsed.verification_info.token
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
        headers: AUTH_HEADERS(idTokenPrePin),
        data: payload,
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

    await test.step('Get profile — verify consent accepted', async () => {
      const response = await request.get(endpoints.signup.getProfile, {
        headers: AUTH_HEADERS(idTokenPostPin),
      })
      const parsed = await parseResponse(response, GetProfileSchema, 'Get Profile')
      expect(parsed.profile.is_consent_accepted).toBe(true)
      expect(parsed.profile.has_pincode).toBe(true)
      signedUpUserId = parsed.profile.user_id
    })

    await test.step('DB — verify consent_status = pending_review', async () => {
      const status = await getEmployeeConsentStatus(employee.employee_id, COMPANY_ID)
      expect(status).toBe('pending_review')
    })

    await test.step('Logout (best-effort)', async () => {
      try {
        await request.post(endpoints.signup.logout, { headers: AUTH_HEADERS(idTokenPostPin) })
      } catch {
        // logout failure does not fail the test
      }
    })
  })

  test('TC-CONSENT-004 · Non-signed-up employees remain consent_status = new', async () => {
    await test.step('DB — verify TS01902 and TS01903 still have consent_status = new', async () => {
      const nonSignedUpIds = [TEST_EMPLOYEES[2].employee_id, TEST_EMPLOYEES[3].employee_id]
      const rows = await getEmployeeProfiles(nonSignedUpIds, COMPANY_ID)
      expect(rows.length).toBe(2)
      for (const row of rows) {
        expect(row.consent_status).toBe('new')
      }
    })
  })
})
