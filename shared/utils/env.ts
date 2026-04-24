import dotenv from 'dotenv'
dotenv.config()

export const ENV = process.env.ENV ?? 'dev'
export const APP_VERSION = process.env.APP_VERSION ?? '10.0.0'

const envKey = ENV.toUpperCase()

// Credentials are typed as string | undefined so that any helper using them
// must explicitly guard against missing values and fail with a clear error,
// rather than silently proceeding with an empty string.
export const ADMIN_EMAIL = process.env[`ADMIN_EMAIL_${envKey}`]
export const ADMIN_PASSWORD = process.env[`ADMIN_PASSWORD_${envKey}`]
export const FIREBASE_API_KEY = process.env[`FIREBASE_API_KEY_${envKey}`]

export const LINE_CHANNEL_ID = process.env[`LINE_CHANNEL_ID_${envKey}`]
export const LINE_CHANNEL_SECRET = process.env[`LINE_CHANNEL_SECRET_${envKey}`]
export const LINE_REFRESH_TOKEN = process.env[`LINE_REFRESH_TOKEN_${envKey}`]
