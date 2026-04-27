/**
 * API call helpers for the Employee ID signup flow.
 *
 * Each function makes one API call and returns the value the test needs.
 * test.step() wrappers are owned by the test file — not here.
 */

import { APIRequestContext } from '@playwright/test'
import { endpoints } from '../../shared/endpoints'
import { OTP } from '../../shared/utils/seed-config'
import { parseResponse } from '../../shared/utils/response'
import { DEFAULT_REQUEST_HEADERS, EMPLOYEE_ID_VERIFY_PARAMS } from './request'
import {
  EmployeeIdLookupSchema,
  EmployeeIdOtpRequestSchema,
  EmployeeIdOtpVerifySchema,
} from '../schema/signup.schema'

/**
 * POST /v1/public/signup/employee-id/lookup
 * Looks up an employee by ID and identity (national_id or passport_no).
 * Returns the auth_challenge for subsequent steps.
 */
export async function lookupEmployee(
  request: APIRequestContext,
  employeeId: string,
  identity: string,
  companyId: number
): Promise<string> {
  const payload = { employee_id: employeeId, identity, company_id: companyId }
  const response = await request.post(endpoints.signup.employeeIdLookup, {
    data: payload,
    headers: DEFAULT_REQUEST_HEADERS,
  })
  const parsed = await parseResponse(response, EmployeeIdLookupSchema, 'Employee ID lookup', 200, payload)
  return parsed.verification_info.auth_challenge
}

/**
 * POST /v1/public/signup/employee-id/phone?action=request
 * Requests an OTP for the given phone number. Returns the ref_code.
 */
export async function requestEmployeeIdOtp(
  request: APIRequestContext,
  phone: string,
  authChallenge: string
): Promise<string> {
  const payload = { phone, auth_challenge: authChallenge }
  const response = await request.post(endpoints.signup.employeeIdAddPhone, {
    params: { verification_method: 'otp', action: 'request' },
    data: payload,
    headers: DEFAULT_REQUEST_HEADERS,
  })
  const parsed = await parseResponse(response, EmployeeIdOtpRequestSchema, 'Employee ID OTP request', 200, payload)
  return parsed.verification.ref_code
}

/**
 * POST /v1/public/signup/employee-id/phone?action=verify
 * Verifies the OTP and returns the Firebase custom token for sign-in.
 */
export async function verifyEmployeeIdOtp(
  request: APIRequestContext,
  phone: string,
  authChallenge: string,
  refCode: string
): Promise<string> {
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
  return parsed.verification.token
}
