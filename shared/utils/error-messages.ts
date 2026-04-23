/**
 * Standardized error messages for common configuration and runtime errors.
 * Ensures consistent error messaging across all helpers.
 */

export const ENV_ERRORS = {
  FIREBASE_API_KEY: (env: string) =>
    `Firebase API key missing. Set FIREBASE_API_KEY_${env.toUpperCase()} in .env`,

  ADMIN_CREDENTIALS: (env: string) =>
    `Admin credentials missing. Set ADMIN_EMAIL_${env.toUpperCase()} and ADMIN_PASSWORD_${env.toUpperCase()} in .env`,

  LINE_CREDENTIALS: (env: string) =>
    `LINE credentials missing. Set LINE_CHANNEL_ID_${env.toUpperCase()}, LINE_CHANNEL_SECRET_${env.toUpperCase()}, and LINE_REFRESH_TOKEN_${env.toUpperCase()} in .env`,
}

export const API_ERRORS = {
  REQUEST_FAILED: (method: string, url: string, status: number, body: string) =>
    `${method} ${url} failed\n  Status: ${status}\n  Response: ${body}`,

  INVALID_RESPONSE: (context: string, details: string) =>
    `${context} returned invalid response: ${details}`,
}
