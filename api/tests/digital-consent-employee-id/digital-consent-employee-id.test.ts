/**
 * Digital Consent — Employee ID Only
 *
 * Tests the consent signup flow for companies that import employee_id only.
 * Unlike the standard consent flow, there are no pre-loaded national_id or
 * passport_no values in the import file. Users provide their own identity
 * (national_id or passport_no) along with first name, last name, and phone
 * during the consent request form step.
 *
 * Company: QA - Digital Consent Employee ID
 * Import fixture: api/fixtures/digital-consent-employee-id-import.xlsx
 */

import { test, expect } from '@playwright/test'
import { getAdminToken } from '../../helpers/admin-console-auth'
import { importDigitalConsentEmployeeIdData } from '../../helpers/digital-consent-employee-id-import'
import { resolvePhone, generateEmail, generateNationalId, generatePassportNo } from '../../helpers/identifiers'
import {
  firebaseSignIn,
  firebaseRefreshToken as firebaseRefreshTokenAPI,
} from '../../helpers/firebase'
import { createPin } from '../../helpers/pin-api'
import { getProfile } from '../../helpers/profile-api'
import { logout } from '../../helpers/auth-api'
import {
  validateScreeningEmployee,
  submitConsentEmployeeIdOnlyRequestForm,
  verifyConsentOtp,
} from '../../helpers/digital-consent-signup-api'
import {
  findSignedUpUserIdsByEmployeeIds,
  deleteEmployeeProfileRecords,
  getEmployeeProfiles,
  hardDeleteEmployee,
} from '../../../shared/db-helpers'
import { getCompany } from '../../../shared/utils/seed-config'

const COMPANY_ID = getCompany('digital_consent_employee_id').id
const TEST_EMPLOYEE_IDS = [
  'EMPAPI-CONSENT-EID-001',
  'EMPAPI-CONSENT-EID-002',
  'EMPAPI-CONSENT-EID-003',
  'EMPAPI-CONSENT-EID-004',
]

/**
 * Finds and hard-deletes users signed up in this company from previous runs.
 * Since the import file has no pre-loaded identity, we search by employee_id
 * via the employment table rather than by national_id/passport_no.
 */
async function cleanupSignedUpUsers(): Promise<void> {
  const userIds = await findSignedUpUserIdsByEmployeeIds(TEST_EMPLOYEE_IDS, COMPANY_ID)
  for (const userId of userIds) {
    try {
      await hardDeleteEmployee(userId)
    } catch {
      // best-effort — user may already be gone
    }
  }
}

test.describe('Digital Consent — Employee ID Only', () => {
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

    await test.step('Run 7-step Digital Consent import (employee_id only)', async () => {
      await importDigitalConsentEmployeeIdData(request, adminToken)
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
    'API – Digital Consent Employee ID Only – Import employee records – consent_status = new',
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
    'API – Digital Consent Employee ID Only – Signup with national_id – consent_status check',
    { tag: ['@component', '@high', '@regression', '@guardian'] },
    async ({ request }) => {
      const employeeId = TEST_EMPLOYEE_IDS[0]
      const phone = resolvePhone()
      const email = generateEmail()
      const nationalId = generateNationalId()
      let refCode: string
      let firebaseCustomToken: string
      let firebaseRefreshToken: string
      let idTokenPrePin: string
      let idTokenPostPin: string

      await test.step('Validate screening identity (employee_id only)', async () => {
        await validateScreeningEmployee(request, employeeId, COMPANY_ID)
      })

      await test.step('Submit consent request form with national_id', async () => {
        refCode = await submitConsentEmployeeIdOnlyRequestForm(
          request,
          employeeId,
          nationalId,
          'national_id',
          COMPANY_ID,
          phone,
          email
        )
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

      await test.step('Get profile — verify employee_profile.consent_status', async () => {
        const body = await getProfile(request, idTokenPostPin)
        expect(body.profile.has_pincode).toBe(true)
        expect(['pending_review', 'new']).toContain(body.employee_profile?.consent_status)
        signedUpUserId = body.profile.user_id
      })

      await test.step('Logout', async () => {
        await logout(request, idTokenPostPin)
      })
    }
  )

  test(
    'API – Digital Consent Employee ID Only – Signup with passport_no – consent_status check',
    { tag: ['@component', '@high', '@regression', '@guardian'] },
    async ({ request }) => {
      const employeeId = TEST_EMPLOYEE_IDS[1]
      const phone = resolvePhone()
      const email = generateEmail()
      const passportNo = generatePassportNo()
      let refCode: string
      let firebaseCustomToken: string
      let firebaseRefreshToken: string
      let idTokenPrePin: string
      let idTokenPostPin: string

      await test.step('Validate screening identity (employee_id only)', async () => {
        await validateScreeningEmployee(request, employeeId, COMPANY_ID)
      })

      await test.step('Submit consent request form with passport_no', async () => {
        refCode = await submitConsentEmployeeIdOnlyRequestForm(
          request,
          employeeId,
          passportNo,
          'passport_no',
          COMPANY_ID,
          phone,
          email
        )
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

      await test.step('Get profile — verify employee_profile.consent_status', async () => {
        const body = await getProfile(request, idTokenPostPin)
        expect(body.profile.has_pincode).toBe(true)
        expect(['pending_review', 'new']).toContain(body.employee_profile?.consent_status)
        signedUpUserId = body.profile.user_id
      })

      await test.step('Logout', async () => {
        await logout(request, idTokenPostPin)
      })
    }
  )

  test(
    'API – Digital Consent Employee ID Only – Non-signed-up employees unaffected – consent_status = new',
    { tag: ['@component', '@high', '@regression', '@guardian'] },
    async () => {
      await test.step('DB — verify EMPAPI-CONSENT-EID-003 and EMPAPI-CONSENT-EID-004 still have consent_status = new', async () => {
        const nonSignedUpIds = [TEST_EMPLOYEE_IDS[2], TEST_EMPLOYEE_IDS[3]]
        const rows = await getEmployeeProfiles(nonSignedUpIds, COMPANY_ID)
        expect(rows.length).toBe(2)
        for (const row of rows) {
          expect(row.consent_status).toBe('new')
        }
      })
    }
  )
})
