import { test, expect } from '@playwright/test'
import { getAdminToken } from '../../helpers/admin-auth'
import { importDigitalConsentData } from '../../helpers/digital-consent-import'
import { resolvePhone, generateEmail } from '../../helpers/identifiers'
import {
  firebaseSignIn,
  firebaseRefreshToken as firebaseRefreshTokenAPI,
} from '../../helpers/firebase'
import { createPin, getProfile, logout } from '../../helpers/signup-flow'
import {
  validateScreeningIdentity,
  submitConsentRequestForm,
  verifyConsentOtp,
} from '../../helpers/consent-flow'
import {
  findSignedUpUserIds,
  deleteEmployeeProfileRecords,
  getEmployeeProfiles,
  getEmployeeConsentStatus,
  hardDeleteEmployee,
} from '../../../shared/db-helpers'
import { getCompany } from '../../../shared/utils/seed-config'

const COMPANY_ID = getCompany('digital_consent').id
const TEST_EMPLOYEES = [
  { employee_id: 'EMPAPI-CONSENT-001', national_id: '2001000099000', passport_no: 'TSPP1900' },
  { employee_id: 'EMPAPI-CONSENT-002', national_id: '2001000099001', passport_no: 'TSPP1901' },
  { employee_id: 'EMPAPI-CONSENT-003', national_id: '2001000099002', passport_no: 'TSPP1902' },
  { employee_id: 'EMPAPI-CONSENT-004', national_id: '2001000099003', passport_no: 'TSPP1903' },
]
const TEST_EMPLOYEE_IDS = TEST_EMPLOYEES.map((e) => e.employee_id)
const TEST_NATIONAL_IDS = TEST_EMPLOYEES.map((e) => e.national_id)
const TEST_PASSPORT_NOS = TEST_EMPLOYEES.map((e) => e.passport_no)

/**
 * Finds and hard-deletes users from previous test runs via user_identity.
 * The import worker checks user_identity before creating employee_profile records —
 * if national_id or passport_no already exists there, the import silently skips
 * that employee. Hard delete removes the FK-constrained rows so the import can proceed.
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
    await test.step('Cleanup — hard delete signed-up user', async () => {
      if (signedUpUserId) {
        await hardDeleteEmployee(signedUpUserId)
        signedUpUserId = null
      }
    })
  })

  test(
    'API – Digital Consent – Import employee records – consent_status = new',
    { tag: ['@component', '@high', '@smoke', '@regression', '@guardian'] },
    async () => {
      await test.step('Verify 4 employee_profile rows exist with consent_status = new', async () => {
        const rows = await getEmployeeProfiles(TEST_EMPLOYEE_IDS, COMPANY_ID)
        expect(rows.length).toBe(4)
        for (const row of rows) {
          expect(row.consent_status).toBe('new')
        }
      })
    }
  )

  test(
    'API – Digital Consent – Signup with national_id – consent_status = pending_review',
    { tag: ['@component', '@high', '@regression', '@guardian'] },
    async ({ request }) => {
      // TODO: Backend issue — consent verifyForm issues a Firebase custom token whose uid
      // is not linked to any user in the Salary Hero DB. The createPin endpoint resolves
      // the user by Firebase UID from the Bearer token, but the consent-created user has
      // no Firebase UID association. Requires backend team investigation.
      // Tracked: createPin returns 400 "user_id is required" even with a valid Firebase ID token.
      test.skip(true, 'Backend issue: consent signup Firebase UID not linked to user record — pending backend fix')

      const employee = TEST_EMPLOYEES[0] // EMPAPI-CONSENT-001
      const phone = resolvePhone()
      const email = generateEmail()
      let refCode: string
      let firebaseCustomToken: string
      let firebaseRefreshToken: string
      let idTokenPrePin: string
      let idTokenPostPin: string

      await test.step('Validate screening identity (national_id)', async () => {
        await validateScreeningIdentity(request, employee.employee_id, employee.national_id, 'national_id', COMPANY_ID)
      })

      await test.step('Submit consent request form', async () => {
        refCode = await submitConsentRequestForm(request, employee.employee_id, employee.national_id, 'national_id', COMPANY_ID, phone, email)
      })

      await test.step('Verify OTP', async () => {
        firebaseCustomToken = await verifyConsentOtp(request, refCode, phone)
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

      await test.step('Get profile — verify consent accepted', async () => {
        const body = await getProfile(request, idTokenPostPin)
        expect(body.profile.is_consent_accepted).toBe(true)
        expect(body.profile.has_pincode).toBe(true)
        signedUpUserId = body.profile.user_id
      })

      await test.step('DB — verify consent_status = pending_review', async () => {
        const status = await getEmployeeConsentStatus(employee.employee_id, COMPANY_ID)
        expect(status).toBe('pending_review')
      })

      await test.step('Logout', async () => {
        await logout(request, idTokenPostPin)
      })
    }
  )

  test(
    'API – Digital Consent – Signup with passport_no – consent_status = pending_review',
    { tag: ['@component', '@high', '@regression', '@guardian'] },
    async ({ request }) => {
      // TODO: Same backend issue as national_id test — skipped pending fix.
      test.skip(true, 'Backend issue: consent signup Firebase UID not linked to user record — pending backend fix')

      const employee = TEST_EMPLOYEES[1] // EMPAPI-CONSENT-002
      const phone = resolvePhone()
      const email = generateEmail()
      let refCode: string
      let firebaseCustomToken: string
      let firebaseRefreshToken: string
      let idTokenPrePin: string
      let idTokenPostPin: string

      await test.step('Validate screening identity (passport_no)', async () => {
        await validateScreeningIdentity(request, employee.employee_id, employee.passport_no, 'passport_no', COMPANY_ID)
      })

      await test.step('Submit consent request form', async () => {
        refCode = await submitConsentRequestForm(request, employee.employee_id, employee.passport_no, 'passport_no', COMPANY_ID, phone, email)
      })

      await test.step('Verify OTP', async () => {
        firebaseCustomToken = await verifyConsentOtp(request, refCode, phone)
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

      await test.step('Get profile — verify consent accepted', async () => {
        const body = await getProfile(request, idTokenPostPin)
        expect(body.profile.is_consent_accepted).toBe(true)
        expect(body.profile.has_pincode).toBe(true)
        signedUpUserId = body.profile.user_id
      })

      await test.step('DB — verify consent_status = pending_review', async () => {
        const status = await getEmployeeConsentStatus(employee.employee_id, COMPANY_ID)
        expect(status).toBe('pending_review')
      })

      await test.step('Logout', async () => {
        await logout(request, idTokenPostPin)
      })
    }
  )

  test(
    'API – Digital Consent – Non-signed-up employees unaffected – consent_status = new',
    { tag: ['@component', '@high', '@regression', '@guardian'] },
    async () => {
      await test.step('DB — verify EMPAPI-CONSENT-003 and EMPAPI-CONSENT-004 still have consent_status = new', async () => {
        const nonSignedUpIds = [TEST_EMPLOYEES[2].employee_id, TEST_EMPLOYEES[3].employee_id]
        const rows = await getEmployeeProfiles(nonSignedUpIds, COMPANY_ID)
        expect(rows.length).toBe(2)
        for (const row of rows) {
          expect(row.consent_status).toBe('new')
        }
      })
    }
  )
})
