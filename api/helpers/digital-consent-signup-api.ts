/**
 * API call helpers for the Digital Consent signup flow.
 *
 * Each function makes one API call and returns the value the test needs.
 * test.step() wrappers are owned by the test file — not here.
 */

import { APIRequestContext } from '@playwright/test'
import { endpoints } from '../../shared/endpoints'
import { OTP } from '../../shared/utils/seed-config'
import { parseResponse } from '../../shared/utils/response'
import { DEFAULT_REQUEST_HEADERS } from './request'
import {
  ScreeningValidateSchema,
  ConsentRequestFormSchema,
  ConsentVerifyFormSchema,
} from '../schema/digital-consent.schema'

export type PersonalIdType = 'national_id' | 'passport_no'

/**
 * POST /v2/public/account/consent/screening/validate
 * Validates the employee's identity against the imported consent record.
 */
export async function validateScreeningIdentity(
  request: APIRequestContext,
  employeeId: string,
  personalId: string,
  personalIdType: PersonalIdType,
  companyId: number
): Promise<void> {
  const payload = {
    employee_id: employeeId,
    personal_id: personalId,
    personal_id_type: personalIdType,
    company_id: companyId,
  }
  const response = await request.post(endpoints.consent.screeningValidate, {
    headers: DEFAULT_REQUEST_HEADERS,
    data: payload,
  })
  await parseResponse(response, ScreeningValidateSchema, 'Screening Validate', 200, payload)
}

/**
 * POST /v2/public/account/consent/request-form/request
 * Submits the consent request form and returns the ref_code for OTP verification.
 */
export async function submitConsentRequestForm(
  request: APIRequestContext,
  employeeId: string,
  personalId: string,
  personalIdType: PersonalIdType,
  companyId: number,
  phone: string,
  email: string
): Promise<string> {
  const payload = {
    personal_id_type: personalIdType,
    company_id: companyId,
    screening: { employee_id: employeeId, personal_id: personalId },
    request_form: { first_name: 'QA', last_name: 'Consent', email, phone },
  }
  const response = await request.post(endpoints.consent.requestForm, {
    headers: DEFAULT_REQUEST_HEADERS,
    data: payload,
  })
  const parsed = await parseResponse(response, ConsentRequestFormSchema, 'Request Form', 200, payload)
  return parsed.verification.ref_code
}

/**
 * POST /v2/public/account/consent/screening/validate
 * Variant for companies that import employee_id only — checks the employee
 * exists in the consent import without requiring a personal_id.
 */
export async function validateScreeningEmployee(
  request: APIRequestContext,
  employeeId: string,
  companyId: number
): Promise<void> {
  const payload = {
    employee_id: employeeId,
    company_id: companyId,
  }
  const response = await request.post(endpoints.consent.screeningValidate, {
    headers: DEFAULT_REQUEST_HEADERS,
    data: payload,
  })
  await parseResponse(response, ScreeningValidateSchema, 'Screening Validate (Employee ID Only)', 200, payload)
}

/**
 * POST /v2/public/account/consent/request-form/request
 * Variant for companies that import employee_id only (no national_id/passport_no
 * pre-loaded). The screening key contains only employee_id; the user-provided
 * identity (national_id or passport_no) is sent in request_form instead.
 * Returns the ref_code for OTP verification.
 */
export async function submitConsentEmployeeIdOnlyRequestForm(
  request: APIRequestContext,
  employeeId: string,
  personalId: string,
  personalIdType: PersonalIdType,
  companyId: number,
  phone: string,
  email: string
): Promise<string> {
  const payload = {
    personal_id_type: personalIdType,
    company_id: companyId,
    screening: {
      employee_id: employeeId,
    },
    request_form: {
      first_name: 'QA',
      last_name: 'Consent',
      personal_id: personalId,
      email,
      phone,
    },
  }
  const response = await request.post(endpoints.consent.requestForm, {
    headers: DEFAULT_REQUEST_HEADERS,
    data: payload,
  })
  const parsed = await parseResponse(response, ConsentRequestFormSchema, 'Request Form (Employee ID Only)', 200, payload)
  return parsed.verification.ref_code
}

/**
 * POST /v1/public/account/consent/request-form/verify
 * Verifies the OTP and returns the Firebase custom token for sign-in.
 */
export async function verifyConsentOtp(
  request: APIRequestContext,
  refCode: string,
  phone: string
): Promise<string> {
  const payload = { ref_code: refCode, code: OTP, phone }
  const response = await request.post(endpoints.consent.verifyForm, {
    headers: DEFAULT_REQUEST_HEADERS,
    data: payload,
  })
  const parsed = await parseResponse(response, ConsentVerifyFormSchema, 'Verify Form', 200, payload)
  return parsed.verification_info.token
}
