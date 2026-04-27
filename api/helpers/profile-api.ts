/**
 * API helper for user profile.
 *
 * Each function makes one API call.
 * test.step() wrappers are owned by the test file — not here.
 */

import { APIRequestContext } from '@playwright/test'
import { z } from 'zod'
import { endpoints } from '../../shared/endpoints'
import { parseResponse } from '../../shared/utils/response'
import { AUTH_HEADERS } from './request'
import { GetProfileSchema } from '../schema/signup.schema'

export type ProfileResponse = z.infer<typeof GetProfileSchema>

/**
 * GET /v1/user/account/profile
 * Returns the authenticated user's full profile.
 * Caller asserts the fields it cares about.
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
