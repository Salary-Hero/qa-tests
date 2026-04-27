/**
 * API call helpers for the LINE signup flow.
 *
 * Each function makes one API call and returns the value the test needs.
 * test.step() wrappers are owned by the test file — not here.
 */

import { APIRequestContext } from '@playwright/test'
import { endpoints } from '../../shared/endpoints'
import { OTP } from '../../shared/utils/seed-config'
import { LINE_CHANNEL_ID } from '../../shared/utils/env'
import { parseResponse } from '../../shared/utils/response'
import { DEFAULT_REQUEST_HEADERS } from './request'
import { getLineAccessToken } from './line-auth'
import {
  LineSignupSchema,
  LineOtpRequestSchema,
  LineOtpVerifySchema,
} from '../schema/signup.schema'

/**
 * POST /v2/public/account/signup/line
 * Submits the LINE access token and returns the auth_challenge for subsequent steps.
 */
export async function submitLineToken(
  request: APIRequestContext
): Promise<string> {
  const lineAccessToken = await getLineAccessToken(request)
  const payload = { channel_id: LINE_CHANNEL_ID, access_token: lineAccessToken, fcm_token: '' }
  const response = await request.post(endpoints.signup.lineSignup, {
    data: payload,
    headers: DEFAULT_REQUEST_HEADERS,
  })
  const parsed = await parseResponse(response, LineSignupSchema, 'LINE signup', 200, payload)
  return parsed.verification_info.auth_challenge
}

/**
 * POST /v2/public/account/signup/line/add-phone?action=request
 * Requests an OTP for the given phone number. Returns the ref_code.
 */
export async function requestLineOtp(
  request: APIRequestContext,
  phone: string,
  authChallenge: string
): Promise<string> {
  const payload = { phone, auth_challenge: authChallenge }
  const response = await request.post(endpoints.signup.lineAddPhone, {
    params: { verification_method: 'otp', action: 'request' },
    data: payload,
    headers: DEFAULT_REQUEST_HEADERS,
  })
  const parsed = await parseResponse(response, LineOtpRequestSchema, 'LINE OTP request', 200, payload)
  return parsed.verification.ref_code
}

/**
 * POST /v2/public/account/signup/line/add-phone?action=verify
 * Verifies the OTP and returns the Firebase custom token for sign-in.
 */
export async function verifyLineOtp(
  request: APIRequestContext,
  phone: string,
  authChallenge: string,
  refCode: string
): Promise<string> {
  const payload = {
    phone,
    auth_challenge: authChallenge,
    fcm_token: '',
    authMethod: 'line',
    verification: { ref_code: refCode, code: OTP },
  }
  const response = await request.post(endpoints.signup.lineAddPhone, {
    params: { verification_method: 'otp', action: 'verify' },
    data: payload,
    headers: DEFAULT_REQUEST_HEADERS,
  })
  const parsed = await parseResponse(response, LineOtpVerifySchema, 'LINE OTP verify', 200, payload)
  return parsed.verification.token
}
