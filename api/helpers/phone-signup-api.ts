/**
 * API call helpers for the Phone signup flow.
 *
 * Each function makes one API call and returns the value the test needs.
 * test.step() wrappers are owned by the test file — not here.
 */

import { APIRequestContext } from '@playwright/test'
import { endpoints } from '../../shared/endpoints'
import { OTP } from '../../shared/utils/seed-config'
import { parseResponse } from '../../shared/utils/response'
import { DEFAULT_REQUEST_HEADERS, PHONE_VERIFY_PARAMS } from './request'
import { OtpRequestSchema, OtpVerifySchema } from '../schema/signup.schema'

/**
 * POST /v2/public/account/signup/phone
 * Requests an OTP for the given phone number. Returns the ref_code.
 */
export async function requestPhoneOtp(
  request: APIRequestContext,
  phone: string
): Promise<string> {
  const payload = { phone }
  const response = await request.post(endpoints.signup.requestOtp, {
    data: payload,
    headers: DEFAULT_REQUEST_HEADERS,
  })
  const parsed = await parseResponse(response, OtpRequestSchema, 'Request OTP', 200, payload)
  return parsed.verification_info.ref_code
}

/**
 * POST /v2/public/account/signup/phone?action=verify
 * Verifies the OTP and returns the Firebase custom token for sign-in.
 */
export async function verifyPhoneOtp(
  request: APIRequestContext,
  phone: string,
  refCode: string
): Promise<string> {
  const payload = { phone, ref_code: refCode, code: OTP }
  const response = await request.post(endpoints.signup.verifyOtp, {
    params: PHONE_VERIFY_PARAMS,
    data: payload,
    headers: DEFAULT_REQUEST_HEADERS,
  })
  const parsed = await parseResponse(response, OtpVerifySchema, 'Verify OTP', 200, payload)
  return parsed.verification_info.token
}
