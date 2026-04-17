import dotenv from 'dotenv'
dotenv.config()

export const ENV = process.env.ENV ?? 'dev'
export const APP_VERSION = process.env.APP_VERSION ?? '10.0.0'
export const OTP = process.env.OTP ?? '111111'
export const PINCODE = process.env.PINCODE ?? '000000'

const envKey = ENV.toUpperCase()
export const ADMIN_EMAIL = process.env[`ADMIN_EMAIL_${envKey}`] ?? ''
export const ADMIN_PASSWORD = process.env[`ADMIN_PASSWORD_${envKey}`] ?? ''
export const FIREBASE_API_KEY = process.env[`FIREBASE_API_KEY_${envKey}`] ?? ''
