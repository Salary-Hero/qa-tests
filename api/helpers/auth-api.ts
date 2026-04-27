/**
 * API helpers for user authentication actions.
 *
 * Each function makes one API call.
 * test.step() wrappers are owned by the test file — not here.
 */

import { APIRequestContext } from '@playwright/test'
import { endpoints } from '../../shared/endpoints'
import { AUTH_HEADERS } from './request'

/**
 * POST /v1/user/account/profile/logout
 * Logs the user out. Best-effort — never throws, since the employee record
 * is hard-deleted in afterEach regardless.
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
