/**
 * Shared helpers for steps that appear in every signup flow:
 * Create PIN, Get Profile, and Logout.
 *
 * These three steps are identical across phone, LINE, employee-ID, and
 * digital-consent tests. Extracting them removes duplication and ensures
 * consistent schema validation everywhere.
 *
 * Callers own the assertions — these helpers return typed data and let
 * each test assert the fields it cares about.
 */

import { APIRequestContext } from '@playwright/test'
import { z } from 'zod'
import { endpoints } from '../../shared/endpoints'
import { PINCODE } from '../../shared/utils/seed-config'
import { parseResponse } from '../../shared/utils/response'
import { AUTH_HEADERS } from './request'
import { CreatePinSchema, GetProfileSchema } from '../schema/signup.schema'

export type ProfileResponse = z.infer<typeof GetProfileSchema>

/**
 * Creates the user's PIN using the pre-PIN id_token.
 * Asserts the API confirms success before returning.
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

/**
 * Fetches the authenticated user's profile using the post-PIN id_token.
 * Returns the full typed profile — caller asserts the fields it cares about.
 */
export async function getProfile(
  request: APIRequestContext,
  idToken: string
): Promise<ProfileResponse> {
  const response = await request.get(endpoints.signup.getProfile, {
    headers: AUTH_HEADERS(idToken),
  })
  return parseResponse(response, GetProfileSchema, 'Get Profile')
}

/**
 * Logs the user out. Best-effort — never throws, logout failure does not
 * fail the test since the employee record is hard-deleted in afterEach anyway.
 */
export async function logout(
  request: APIRequestContext,
  idToken: string
): Promise<void> {
  try {
    await request.post(endpoints.signup.logout, {
      headers: AUTH_HEADERS(idToken),
    })
  } catch {
    // best-effort
  }
}
