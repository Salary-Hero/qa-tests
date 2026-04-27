/**
 * API helper for PIN management.
 *
 * Each function makes one API call.
 * test.step() wrappers are owned by the test file — not here.
 */

import { APIRequestContext } from '@playwright/test'
import { endpoints } from '../../shared/endpoints'
import { PINCODE } from '../../shared/utils/seed-config'
import { parseResponse } from '../../shared/utils/response'
import { AUTH_HEADERS } from './request'
import { CreatePinSchema } from '../schema/signup.schema'

/**
 * POST /v1/user/account/profile/pincode/create
 * Creates the user's PIN. Throws if the API does not confirm success.
 */
export async function createPin(
  request: APIRequestContext,
  idToken: string
): Promise<void> {
  const payload = { pincode: PINCODE }
  const response = await request.post(endpoints.signup.createPin, {
    data: payload,
    headers: AUTH_HEADERS(idToken),
  })
  const parsed = await parseResponse(response, CreatePinSchema, 'Create PIN', 200, payload)
  if (parsed.message !== 'Create PIN successfully') {
    throw new Error(`createPin: unexpected message "${parsed.message}"`)
  }
}
