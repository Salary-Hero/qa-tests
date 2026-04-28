import { test, expect } from '@playwright/test'
import { getAdminToken } from '../../helpers/admin-console-auth'
import { importDigitalConsentData } from '../../helpers/digital-consent-import'
import { importDigitalConsentEmployeeIdData } from '../../helpers/digital-consent-employee-id-import'
import {
  resolvePhone,
  generateEmail,
  generateNationalId,
  generatePassportNo,
} from '../../helpers/identifiers'
import {
  firebaseSignIn,
  firebaseRefreshToken as firebaseRefreshTokenAPI,
} from '../../helpers/firebase'
import { createPin } from '../../helpers/pin-api'
import { getProfile } from '../../helpers/profile-api'
import { logout } from '../../helpers/auth-api'
import {
  validateScreeningIdentity,
  submitConsentRequestForm,
  validateScreeningEmployee,
  submitConsentEmployeeIdOnlyRequestForm,
  verifyConsentOtp,
} from '../../helpers/digital-consent-signup-api'
import {
  cleanupConsentSignedUpUsers,
  cleanupConsentEidSignedUpUsers,
  deleteEmployeeProfileRecords,
  getEmployeeProfiles,
  hardDeleteEmployee,
} from '../../../shared/db-helpers'
import { getCompany } from '../../../shared/utils/seed-config'

const CONSENT_COMPANY_ID = getCompany('digital_consent').id
const CONSENT_EMPLOYEES = [
  { employee_id: 'EMPAPI-CONSENT-001', national_id: '2001000099000', passport_no: 'TSPP1900' },
  { employee_id: 'EMPAPI-CONSENT-002', national_id: '2001000099001', passport_no: 'TSPP1901' },
  { employee_id: 'EMPAPI-CONSENT-003', national_id: '2001000099002', passport_no: 'TSPP1902' },
  { employee_id: 'EMPAPI-CONSENT-004', national_id: '2001000099003', passport_no: 'TSPP1903' },
]
const CONSENT_EMPLOYEE_IDS = CONSENT_EMPLOYEES.map((e) => e.employee_id)
const CONSENT_NATIONAL_IDS = CONSENT_EMPLOYEES.map((e) => e.national_id)
const CONSENT_PASSPORT_NOS = CONSENT_EMPLOYEES.map((e) => e.passport_no)

const CONSENT_EID_COMPANY_ID = getCompany('digital_consent_employee_id').id
const CONSENT_EID_EMPLOYEE_IDS = [
  'EMPAPI-CONSENT-EID-001',
  'EMPAPI-CONSENT-EID-002',
  'EMPAPI-CONSENT-EID-003',
  'EMPAPI-CONSENT-EID-004',
]

test.describe('Digital Consent', () => {
  test.describe.configure({ mode: 'serial' })

  let adminToken: string
  let signedUpUserId: string | null = null

  test.beforeAll(async ({ request }) => {
    await test.step('Cleanup signed-up users from previous runs', async () => {
      await cleanupConsentSignedUpUsers(CONSENT_NATIONAL_IDS, CONSENT_PASSPORT_NOS)
    })

    await test.step('Cleanup employee_profile records from previous runs', async () => {
      await deleteEmployeeProfileRecords(CONSENT_EMPLOYEE_IDS, CONSENT_COMPANY_ID)
    })

    await test.step('Login as admin', async () => {
      adminToken = await getAdminToken(request)
    })

    await test.step('Run 7-step Digital Consent import', async () => {
      await importDigitalConsentData(request, adminToken)
      await new Promise((resolve) => setTimeout(resolve, 3000))
    })
  })

  test.afterAll(async () => {
    await test.step('Cleanup signed-up users', async () => {
      await cleanupConsentSignedUpUsers(CONSENT_NATIONAL_IDS, CONSENT_PASSPORT_NOS)
    })

    await test.step('Cleanup employee_profile records', async () => {
      await deleteEmployeeProfileRecords(CONSENT_EMPLOYEE_IDS, CONSENT_COMPANY_ID)
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
        const rows = await getEmployeeProfiles(CONSENT_EMPLOYEE_IDS, CONSENT_COMPANY_ID)
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
      const employee = CONSENT_EMPLOYEES[0]
      const phone = resolvePhone()
      const email = generateEmail()
      let refCode: string
      let firebaseCustomToken: string
      let firebaseRefreshToken: string
      let idTokenPrePin: string
      let idTokenPostPin: string

      await test.step('Validate screening identity (national_id)', async () => {
        await validateScreeningIdentity(request, employee.employee_id, employee.national_id, 'national_id', CONSENT_COMPANY_ID)
      })

      await test.step('Submit consent request form', async () => {
        refCode = await submitConsentRequestForm(request, employee.employee_id, employee.national_id, 'national_id', CONSENT_COMPANY_ID, phone, email)
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
    'API – Digital Consent – Signup with passport_no – consent_status = pending_review',
    { tag: ['@component', '@high', '@regression', '@guardian'] },
    async ({ request }) => {
      const employee = CONSENT_EMPLOYEES[1]
      const phone = resolvePhone()
      const email = generateEmail()
      let refCode: string
      let firebaseCustomToken: string
      let firebaseRefreshToken: string
      let idTokenPrePin: string
      let idTokenPostPin: string

      await test.step('Validate screening identity (passport_no)', async () => {
        await validateScreeningIdentity(request, employee.employee_id, employee.passport_no, 'passport_no', CONSENT_COMPANY_ID)
      })

      await test.step('Submit consent request form', async () => {
        refCode = await submitConsentRequestForm(request, employee.employee_id, employee.passport_no, 'passport_no', CONSENT_COMPANY_ID, phone, email)
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
    'API – Digital Consent – Non-signed-up employees unaffected – consent_status = new',
    { tag: ['@component', '@high', '@regression', '@guardian'] },
    async () => {
      await test.step('DB — verify EMPAPI-CONSENT-003 and EMPAPI-CONSENT-004 still have consent_status = new', async () => {
        const nonSignedUpIds = [CONSENT_EMPLOYEES[2].employee_id, CONSENT_EMPLOYEES[3].employee_id]
        const rows = await getEmployeeProfiles(nonSignedUpIds, CONSENT_COMPANY_ID)
        expect(rows.length).toBe(2)
        for (const row of rows) {
          expect(row.consent_status).toBe('new')
        }
      })
    }
  )
})

test.describe('Digital Consent — Employee ID Only', () => {
  test.describe.configure({ mode: 'serial' })

  let adminToken: string
  let signedUpUserId: string | null = null

  test.beforeAll(async ({ request }) => {
    await test.step('Cleanup signed-up users from previous runs', async () => {
      await cleanupConsentEidSignedUpUsers(CONSENT_EID_EMPLOYEE_IDS, CONSENT_EID_COMPANY_ID)
    })

    await test.step('Cleanup employee_profile records from previous runs', async () => {
      await deleteEmployeeProfileRecords(CONSENT_EID_EMPLOYEE_IDS, CONSENT_EID_COMPANY_ID)
    })

    await test.step('Login as admin', async () => {
      adminToken = await getAdminToken(request)
    })

    await test.step('Run 7-step Digital Consent import (employee_id only)', async () => {
      await importDigitalConsentEmployeeIdData(request, adminToken)
      await new Promise((resolve) => setTimeout(resolve, 3000))
    })
  })

  test.afterAll(async () => {
    await test.step('Cleanup signed-up users', async () => {
      await cleanupConsentEidSignedUpUsers(CONSENT_EID_EMPLOYEE_IDS, CONSENT_EID_COMPANY_ID)
    })

    await test.step('Cleanup employee_profile records', async () => {
      await deleteEmployeeProfileRecords(CONSENT_EID_EMPLOYEE_IDS, CONSENT_EID_COMPANY_ID)
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
        const rows = await getEmployeeProfiles(CONSENT_EID_EMPLOYEE_IDS, CONSENT_EID_COMPANY_ID)
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
      const employeeId = CONSENT_EID_EMPLOYEE_IDS[0]
      const phone = resolvePhone()
      const email = generateEmail()
      const nationalId = generateNationalId()
      let refCode: string
      let firebaseCustomToken: string
      let firebaseRefreshToken: string
      let idTokenPrePin: string
      let idTokenPostPin: string

      await test.step('Validate screening identity (employee_id only)', async () => {
        await validateScreeningEmployee(request, employeeId, CONSENT_EID_COMPANY_ID)
      })

      await test.step('Submit consent request form with national_id', async () => {
        refCode = await submitConsentEmployeeIdOnlyRequestForm(request, employeeId, nationalId, 'national_id', CONSENT_EID_COMPANY_ID, phone, email)
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
      const employeeId = CONSENT_EID_EMPLOYEE_IDS[1]
      const phone = resolvePhone()
      const email = generateEmail()
      const passportNo = generatePassportNo()
      let refCode: string
      let firebaseCustomToken: string
      let firebaseRefreshToken: string
      let idTokenPrePin: string
      let idTokenPostPin: string

      await test.step('Validate screening identity (employee_id only)', async () => {
        await validateScreeningEmployee(request, employeeId, CONSENT_EID_COMPANY_ID)
      })

      await test.step('Submit consent request form with passport_no', async () => {
        refCode = await submitConsentEmployeeIdOnlyRequestForm(request, employeeId, passportNo, 'passport_no', CONSENT_EID_COMPANY_ID, phone, email)
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
        const nonSignedUpIds = [CONSENT_EID_EMPLOYEE_IDS[2], CONSENT_EID_EMPLOYEE_IDS[3]]
        const rows = await getEmployeeProfiles(nonSignedUpIds, CONSENT_EID_COMPANY_ID)
        expect(rows.length).toBe(2)
        for (const row of rows) {
          expect(row.consent_status).toBe('new')
        }
      })
    }
  )
})
