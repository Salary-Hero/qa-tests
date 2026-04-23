/**
 * Centralized HTTP request configuration constants.
 *
 * Consolidates headers used across test files.
 * Makes it easy to update request behavior in one place.
 */

import { APP_VERSION } from '../../shared/utils/env'

export const DEFAULT_REQUEST_HEADERS = {
  'x-app-version': APP_VERSION,
}

export const AUTH_HEADERS = (token: string) => ({
  ...DEFAULT_REQUEST_HEADERS,
  Authorization: `Bearer ${token}`,
})

export const EMPLOYEE_ID_VERIFY_PARAMS = {
  action: 'verify',
}

export const PHONE_VERIFY_PARAMS = {
  action: 'verify',
}
