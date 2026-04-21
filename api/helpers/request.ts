/**
 * Centralized HTTP request configuration constants.
 *
 * Consolidates headers, parameters, and other request details used across test files.
 * Makes it easy to update request behavior in one place.
 */

import { APP_VERSION } from '../../shared/utils/env'

export const DEFAULT_REQUEST_HEADERS = {
  'x-app-version': APP_VERSION,
}

export const OTP_REQUEST_HEADERS = {
  ...DEFAULT_REQUEST_HEADERS,
  'Content-Type': 'application/json',
}

export const AUTH_HEADER = (token: string) => ({
  Authorization: `Bearer ${token}`,
})

export const AUTH_HEADERS = (token: string) => ({
  ...DEFAULT_REQUEST_HEADERS,
  ...AUTH_HEADER(token),
})

export const EMPLOYEE_ID_VERIFY_PARAMS = {
  action: 'verify',
}

export const PHONE_VERIFY_PARAMS = {
  action: 'verify',
}
